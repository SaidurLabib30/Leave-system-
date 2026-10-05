update public.users
set role = 'manager',
    manager_id = null,
    session_version = session_version + 1
where role = 'admin';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('employee', 'manager'));

alter table public.users
  drop constraint if exists managers_cannot_have_managers;

alter table public.users
  add constraint managers_cannot_have_managers
  check (role <> 'manager' or manager_id is null);

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