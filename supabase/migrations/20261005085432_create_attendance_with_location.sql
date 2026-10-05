create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  attendance_date date not null,
  shift_id text not null
    check (shift_id in ('shift-1', 'shift-2', 'off', 'leave', 'holiday-duty')),
  check_in_at timestamptz not null default now(),
  check_in_latitude double precision not null
    check (check_in_latitude between -90 and 90),
  check_in_longitude double precision not null
    check (check_in_longitude between -180 and 180),
  check_in_accuracy_m double precision not null
    check (check_in_accuracy_m >= 0),
  check_out_at timestamptz,
  check_out_latitude double precision
    check (check_out_latitude between -90 and 90),
  check_out_longitude double precision
    check (check_out_longitude between -180 and 180),
  check_out_accuracy_m double precision
    check (check_out_accuracy_m >= 0),
  status text not null default 'working'
    check (status in ('working', 'completed')),
  created_at timestamptz not null default now(),
  constraint attendance_user_date_key unique (user_id, attendance_date),
  constraint attendance_checkout_location_consistent check (
    (check_out_at is null
      and check_out_latitude is null
      and check_out_longitude is null
      and check_out_accuracy_m is null
      and status = 'working')
    or
    (check_out_at is not null
      and check_out_latitude is not null
      and check_out_longitude is not null
      and check_out_accuracy_m is not null
      and status = 'completed')
  )
);

create index if not exists attendance_date_idx
  on public.attendance (attendance_date desc);

alter table public.attendance enable row level security;
revoke all on public.attendance from anon, authenticated;
grant all on public.attendance to service_role;