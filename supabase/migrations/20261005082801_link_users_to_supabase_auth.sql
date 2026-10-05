alter table public.users
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_auth_user_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users (id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists users_auth_user_id_uidx
  on public.users (auth_user_id);

update public.users as app_user
set auth_user_id = auth_user.id
from auth.users as auth_user
where app_user.auth_user_id is null
  and auth_user.email is not null
  and app_user.email = lower(auth_user.email);