create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  employee_id text not null unique,
  name text not null,
  email text not null unique,
  category text not null default 'Employee'
    check (category in ('Employee', 'Manager')),
  department text,
  designation text,
  joining_date date,
  probation_cleared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_category_idx
  on public.employees (category);

create or replace function public.set_employees_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_employees_updated_at();

alter table public.employees enable row level security;

drop policy if exists "Employees can read own profile" on public.employees;
create policy "Employees can read own profile"
  on public.employees
  for select
  to authenticated
  using (
    auth_user_id = (select auth.uid())
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
      in ('manager', 'admin')
  );
