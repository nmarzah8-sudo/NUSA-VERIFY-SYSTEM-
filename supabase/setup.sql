create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  student_id text primary key check (length(trim(student_id)) > 0),
  full_name text not null check (length(trim(full_name)) > 0),
  major text not null check (length(trim(major)) > 0),
  position text not null check (position in ('President', 'Vice President', 'Secretary General', 'Treasurer', 'Member')),
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Graduated', 'Revoked')),
  verification_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

alter table public.admin_users enable row level security;
alter table public.students enable row level security;

drop policy if exists "Admins can read own admin membership" on public.admin_users;
create policy "Admins can read own admin membership"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Admins can manage students" on public.students;
create policy "Admins can manage students"
on public.students for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
revoke all on public.students from public, anon, authenticated;
grant select, insert, update, delete on public.students to authenticated;

create or replace function public.verify_student(lookup_token uuid)
returns table (
  full_name text,
  student_id text,
  major text,
  position text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.full_name, s.student_id, s.major, s.position, s.status
  from public.students as s
  where s.verification_token = lookup_token
  limit 1;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.verify_student(uuid) from public, authenticated;
grant execute on function public.verify_student(uuid) to anon, authenticated;

comment on function public.verify_student(uuid) is
  'Public verification by UUID token. Exposes only the five student identity/status fields.';