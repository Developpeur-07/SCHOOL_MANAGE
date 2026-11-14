-- Étape 2 — Socle multi-tenant SCHOOL_MANAGE.
-- Les tables sont en RLS + FORCE RLS dès leur création : sans politique, tout est refusé.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'parent',
  'direction',
  'secretary',
  'accountant',
  'teacher',
  'supervisor'
);

create type public.publication_status as enum ('draft', 'published');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.payment_method as enum ('cash', 'bank_transfer', 'cheque', 'other');
create type public.announcement_target_type as enum (
  'whole_school',
  'class',
  'overdue',
  'student'
);
create type public.notification_event_type as enum (
  'grade_published',
  'grade_updated',
  'attendance_recorded',
  'attendance_updated',
  'payment_recorded',
  'announcement_published'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'Africa/Brazzaville',
  locale text not null default 'fr-CG',
  currency_code text not null default 'XAF' check (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.schools enable row level security;
alter table public.schools force row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  role public.app_role not null,
  full_name text not null check (char_length(full_name) between 2 and 160),
  phone text check (phone is null or char_length(phone) between 8 and 24),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id)
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  school_year text not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  name text not null check (char_length(name) between 1 and 100),
  level text check (level is null or char_length(level) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, school_year, name)
);
alter table public.classes enable row level security;
alter table public.classes force row level security;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9_-]{2,24}$'),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, code)
);
alter table public.subjects enable row level security;
alter table public.subjects force row level security;

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  school_year text not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  name text not null check (char_length(name) between 2 and 100),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (school_id, id),
  unique (school_id, school_year, name)
);
alter table public.periods enable row level security;
alter table public.periods force row level security;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid not null,
  student_code text not null check (student_code ~ '^[A-Z0-9_-]{3,40}$'),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_class_same_school
    foreign key (school_id, class_id) references public.classes(school_id, id) on delete restrict,
  unique (school_id, id),
  unique (school_id, student_code)
);
alter table public.students enable row level security;
alter table public.students force row level security;

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  guardian_id uuid not null,
  student_id uuid not null,
  relationship_label text not null check (char_length(relationship_label) between 2 and 60),
  is_active boolean not null default true,
  starts_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guardian_links_profile_same_school
    foreign key (school_id, guardian_id) references public.profiles(school_id, id) on delete restrict,
  constraint guardian_links_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  check (ended_on is null or ended_on >= starts_on),
  check (is_active or ended_on is not null),
  check (not is_active or ended_on is null),
  unique (school_id, id),
  unique (school_id, guardian_id, student_id)
);
alter table public.guardian_links enable row level security;
alter table public.guardian_links force row level security;

create index students_school_class_idx on public.students(school_id, class_id);
create index guardian_links_student_active_idx
  on public.guardian_links(school_id, student_id, guardian_id)
  where is_active;
create index guardian_links_guardian_active_idx
  on public.guardian_links(guardian_id, school_id, student_id)
  where is_active;
create index profiles_school_role_idx on public.profiles(school_id, role) where is_active;
create index classes_school_year_idx on public.classes(school_id, school_year);
create index periods_school_dates_idx on public.periods(school_id, starts_on, ends_on);
