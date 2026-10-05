alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('employee', 'manager', 'admin'));

alter table public.users
  drop constraint if exists managers_cannot_have_managers;

alter table public.users
  add constraint managers_cannot_have_managers
  check (role not in ('manager', 'admin') or manager_id is null);
