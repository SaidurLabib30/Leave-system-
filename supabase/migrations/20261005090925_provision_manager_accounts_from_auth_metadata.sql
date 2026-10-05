insert into public.users (
  auth_user_id,
  user_id,
  name,
  email,
  password_hash,
  role,
  status,
  manager_id
)
select
  auth_user.id,
  'MGR-' || upper(auth_user.id::text),
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'name'), ''),
    split_part(lower(auth_user.email), '@', 1)
  ),
  lower(auth_user.email),
  'supabase-auth-managed',
  'manager',
  'active',
  null
from auth.users as auth_user
where auth_user.email is not null
  and coalesce(auth_user.raw_app_meta_data ->> 'role', '') in ('manager', 'admin')
  and not exists (
    select 1
    from public.users as app_user
    where app_user.auth_user_id = auth_user.id
       or app_user.email = lower(auth_user.email)
  )
on conflict do nothing;