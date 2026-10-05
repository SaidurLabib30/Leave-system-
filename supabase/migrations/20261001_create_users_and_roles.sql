create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  name text not null,
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  role text not null check (role in ('employee', 'manager')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  manager_id uuid references public.users (id) on delete set null,
  session_version integer not null default 0 check (session_version >= 0),
  department text,
  designation text,
  joining_date date,
  probation_cleared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint managers_cannot_have_managers check (role <> 'manager' or manager_id is null)
);

create index if not exists users_manager_id_idx on public.users (manager_id);
create index if not exists users_role_status_idx on public.users (role, status);

create or replace function public.set_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_user_manager()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  manager_role text;
  manager_status text;
begin
  if new.manager_id is null then
    return new;
  end if;

  select role, status into manager_role, manager_status
  from public.users
  where id = new.manager_id;

  if manager_role is distinct from 'manager' or manager_status is distinct from 'active' then
    raise exception 'manager_id must reference an active manager';
  end if;

  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_users_updated_at();

drop trigger if exists users_validate_manager on public.users;
create trigger users_validate_manager
before insert or update of role, manager_id on public.users
for each row execute function public.validate_user_manager();

alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
grant all on public.users to service_role;