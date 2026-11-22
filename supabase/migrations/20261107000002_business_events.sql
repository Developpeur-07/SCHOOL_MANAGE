-- Étape 2 — Événements scolaires, finances, annonces et journal d’audit.
-- Aucune distribution push n’est implémentée ici (étape 7).

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  student_id uuid not null,
  subject_id uuid not null,
  period_id uuid not null,
  evaluation_label text not null check (char_length(evaluation_label) between 1 and 120),
  score numeric(7,2) not null check (score >= 0),
  max_score numeric(7,2) not null check (max_score > 0),
  status public.publication_status not null default 'draft',
  graded_by uuid not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  constraint grades_subject_same_school
    foreign key (school_id, subject_id) references public.subjects(school_id, id) on delete restrict,
  constraint grades_period_same_school
    foreign key (school_id, period_id) references public.periods(school_id, id) on delete restrict,
  constraint grades_grader_same_school
    foreign key (school_id, graded_by) references public.profiles(school_id, id) on delete restrict,
  check (score <= max_score),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  ),
  unique (school_id, id),
  unique (school_id, student_id, subject_id, period_id, evaluation_label)
);
alter table public.grades enable row level security;
alter table public.grades force row level security;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  student_id uuid not null,
  class_id uuid not null,
  attendance_date date not null,
  status public.attendance_status not null,
  comment text check (comment is null or char_length(comment) <= 500),
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  constraint attendance_class_same_school
    foreign key (school_id, class_id) references public.classes(school_id, id) on delete restrict,
  constraint attendance_recorder_same_school
    foreign key (school_id, recorded_by) references public.profiles(school_id, id) on delete restrict,
  unique (school_id, id),
  unique (school_id, student_id, attendance_date)
);
alter table public.attendance enable row level security;
alter table public.attendance force row level security;

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  student_id uuid not null,
  label text not null check (char_length(label) between 2 and 160),
  amount_minor bigint not null check (amount_minor > 0),
  due_on date not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fees_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  constraint fees_creator_same_school
    foreign key (school_id, created_by) references public.profiles(school_id, id) on delete restrict,
  unique (school_id, id)
);
alter table public.fees enable row level security;
alter table public.fees force row level security;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  fee_id uuid not null,
  student_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid_at timestamptz not null default now(),
  payment_method public.payment_method not null,
  receipt_number text not null default (
    'REC-' || to_char(now(), 'YYYY') || '-' || upper(substr(gen_random_uuid()::text, 1, 12))
  ),
  received_by uuid not null,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  constraint payments_fee_same_school
    foreign key (school_id, fee_id) references public.fees(school_id, id) on delete restrict,
  constraint payments_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  constraint payments_receiver_same_school
    foreign key (school_id, received_by) references public.profiles(school_id, id) on delete restrict,
  unique (school_id, id),
  unique (school_id, receipt_number)
);
alter table public.payments enable row level security;
alter table public.payments force row level security;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 180),
  body text not null check (char_length(body) between 1 and 10000),
  status public.publication_status not null default 'draft',
  created_by uuid not null,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_creator_same_school
    foreign key (school_id, created_by) references public.profiles(school_id, id) on delete restrict,
  constraint announcements_publisher_same_school
    foreign key (school_id, published_by) references public.profiles(school_id, id) on delete restrict,
  check (
    (status = 'draft' and published_at is null and published_by is null)
    or (status = 'published' and published_at is not null and published_by is not null)
  ),
  unique (school_id, id)
);
alter table public.announcements enable row level security;
alter table public.announcements force row level security;

create table public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  announcement_id uuid not null,
  target_type public.announcement_target_type not null,
  class_id uuid,
  student_id uuid,
  created_at timestamptz not null default now(),
  constraint announcement_targets_announcement_same_school
    foreign key (school_id, announcement_id) references public.announcements(school_id, id) on delete cascade,
  constraint announcement_targets_class_same_school
    foreign key (school_id, class_id) references public.classes(school_id, id) on delete restrict,
  constraint announcement_targets_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  check (
    (target_type in ('whole_school', 'overdue') and class_id is null and student_id is null)
    or (target_type = 'class' and class_id is not null and student_id is null)
    or (target_type = 'student' and student_id is not null and class_id is null)
  ),
  unique (school_id, id)
);
alter table public.announcement_targets enable row level security;
alter table public.announcement_targets force row level security;

create unique index announcement_targets_unique_target_idx
  on public.announcement_targets(
    announcement_id,
    target_type,
    coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  recipient_id uuid not null,
  student_id uuid not null,
  announcement_id uuid,
  event_type public.notification_event_type not null,
  source_id uuid not null,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_same_school
    foreign key (school_id, recipient_id) references public.profiles(school_id, id) on delete restrict,
  constraint notifications_student_same_school
    foreign key (school_id, student_id) references public.students(school_id, id) on delete restrict,
  constraint notifications_announcement_same_school
    foreign key (school_id, announcement_id) references public.announcements(school_id, id) on delete restrict,
  check (
    (event_type = 'announcement_published' and announcement_id is not null and source_id = announcement_id)
    or (event_type <> 'announcement_published' and announcement_id is null)
  ),
  unique (school_id, id),
  unique (school_id, recipient_id, student_id, event_type, source_id)
);
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_table text not null check (entity_table ~ '^[a-z_]+$'),
  entity_id uuid not null,
  changed_fields text[] not null default '{}',
  transaction_id bigint not null default txid_current(),
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

create index grades_school_student_idx on public.grades(school_id, student_id, status);
create index grades_school_subject_period_idx on public.grades(school_id, subject_id, period_id);
create index attendance_school_student_date_idx
  on public.attendance(school_id, student_id, attendance_date desc);
create index attendance_school_class_date_idx
  on public.attendance(school_id, class_id, attendance_date desc);
create index fees_school_student_due_idx on public.fees(school_id, student_id, due_on);
create index payments_school_student_idx on public.payments(school_id, student_id, paid_at desc);
create index payments_fee_idx on public.payments(fee_id);
create index announcements_school_status_idx on public.announcements(school_id, status, created_at desc);
create index announcement_targets_lookup_idx
  on public.announcement_targets(school_id, target_type, class_id, student_id);
create index notifications_recipient_unread_idx
  on public.notifications(recipient_id, school_id, created_at desc)
  where read_at is null;
create index notifications_student_idx on public.notifications(school_id, student_id);
create index notifications_announcement_idx on public.notifications(announcement_id, recipient_id);
create index audit_log_school_entity_idx
  on public.audit_log(school_id, entity_table, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log(actor_id, created_at desc);
create index audit_log_school_transaction_idx on public.audit_log(school_id, transaction_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Ne transforme pas une écriture sans changement réel en mise à jour utile.
  -- Cela permet aussi au trigger d’audit de sortir immédiatement dans ce cas.
  if new is distinct from old then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.prevent_school_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.school_id is distinct from old.school_id then
    raise exception 'school_id est immutable' using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_created_by_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by est immutable' using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_graded_by_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.graded_by is distinct from old.graded_by then
    raise exception 'graded_by est immutable ; l’auteur de la correction figure dans audit_log'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_recorded_by_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.recorded_by is distinct from old.recorded_by then
    raise exception 'recorded_by est immutable ; l’auteur de la correction figure dans audit_log'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_guardian_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.guardian_id is distinct from old.guardian_id
    or new.student_id is distinct from old.student_id
  then
    raise exception 'Le tuteur et l’élève d’un lien sont immuables'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_grade_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.subject_id is distinct from old.subject_id
    or new.period_id is distinct from old.period_id
  then
    raise exception 'L’élève, la matière et la période d’une note sont immuables'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_attendance_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id
    or new.class_id is distinct from old.class_id
    or new.attendance_date is distinct from old.attendance_date
  then
    raise exception 'L’élève, la classe et la date d’une présence sont immuables'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create or replace function public.validate_guardian_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = new.guardian_id
      and profile.school_id = new.school_id
      and profile.role = 'parent'
      and profile.is_active
  ) then
    raise exception 'Le tuteur doit être un parent actif de la même école'
      using errcode = 'integrity_constraint_violation';
  end if;

  if new.is_active then
    new.ended_on = null;
  elsif new.ended_on is null then
    new.ended_on = current_date;
  end if;

  return new;
end;
$$;

create or replace function public.validate_attendance_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  context_changed boolean;
begin
  -- class_id est un cliché historique. On le vérifie à la création ou lors
  -- d’un changement d’élève/classe, mais on permet la correction d’un ancien
  -- statut après le changement de classe courante de l’élève.
  if tg_op = 'INSERT' then
    context_changed = true;
  else
    context_changed = new.student_id is distinct from old.student_id
      or new.class_id is distinct from old.class_id;
  end if;

  if context_changed then
    if not exists (
      select 1
      from public.students as student
      where student.id = new.student_id
        and student.school_id = new.school_id
        and student.class_id = new.class_id
    ) then
      raise exception 'La classe de présence doit être la classe courante de l’élève'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_grade_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at = now();
    else
      new.published_at = null;
    end if;
  elsif new.status = 'published' and old.status = 'draft' then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  else
    new.published_at = old.published_at;
  end if;
  return new;
end;
$$;

create or replace function public.validate_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fee_amount bigint;
  already_paid bigint;
begin
  select fee.amount_minor
  into fee_amount
  from public.fees as fee
  where fee.id = new.fee_id
    and fee.school_id = new.school_id
    and fee.student_id = new.student_id
  for update;

  if not found then
    raise exception 'Le frais, l’élève et l’école du paiement ne correspondent pas'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(payment.amount_minor), 0)
  into already_paid
  from public.payments as payment
  where payment.fee_id = new.fee_id;

  if already_paid + new.amount_minor > fee_amount then
    raise exception 'Le paiement dépasserait le montant du frais'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function public.validate_fee_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  already_paid bigint;
begin
  if new.student_id is distinct from old.student_id then
    raise exception 'L’élève d’un frais est immutable'
      using errcode = 'integrity_constraint_violation';
  end if;

  if new.amount_minor is distinct from old.amount_minor then
    select coalesce(sum(payment.amount_minor), 0)
    into already_paid
    from public.payments as payment
    where payment.fee_id = old.id;

    if new.amount_minor < already_paid then
      raise exception 'Le montant du frais ne peut pas être inférieur aux paiements reçus'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_announcement_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'Une annonce publiée est immutable'
      using errcode = 'integrity_constraint_violation';
  end if;

  if new.status = 'published' and old.status = 'draft' then
    if not exists (
      select 1
      from public.announcement_targets as target
      where target.announcement_id = new.id
        and target.school_id = new.school_id
    ) then
      raise exception 'Une annonce publiée doit avoir au moins une cible'
        using errcode = 'check_violation';
    end if;

    new.published_by = auth.uid();
    new.published_at = now();
  else
    new.published_by = null;
    new.published_at = null;
  end if;

  return new;
end;
$$;

create or replace function public.validate_announcement_target_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_announcement_id uuid;
  target_school_id uuid;
  announcement_status public.publication_status;
begin
  if tg_op = 'DELETE' then
    target_announcement_id = old.announcement_id;
    target_school_id = old.school_id;
  else
    target_announcement_id = new.announcement_id;
    target_school_id = new.school_id;
  end if;

  select announcement.status
  into announcement_status
  from public.announcements as announcement
  where announcement.id = target_announcement_id
    and announcement.school_id = target_school_id;

  if announcement_status is distinct from 'draft'::public.publication_status then
    raise exception 'Les cibles sont modifiables uniquement pour un brouillon'
      using errcode = 'integrity_constraint_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger schools_set_updated_at before update on public.schools
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
for each row execute function public.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();
create trigger periods_set_updated_at before update on public.periods
for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students
for each row execute function public.set_updated_at();
create trigger guardian_links_set_updated_at before update on public.guardian_links
for each row execute function public.set_updated_at();
create trigger grades_set_updated_at before update on public.grades
for each row execute function public.set_updated_at();
create trigger attendance_set_updated_at before update on public.attendance
for each row execute function public.set_updated_at();
create trigger fees_set_updated_at before update on public.fees
for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create trigger profiles_prevent_school_change before update on public.profiles
for each row execute function public.prevent_school_change();
create trigger classes_prevent_school_change before update on public.classes
for each row execute function public.prevent_school_change();
create trigger subjects_prevent_school_change before update on public.subjects
for each row execute function public.prevent_school_change();
create trigger periods_prevent_school_change before update on public.periods
for each row execute function public.prevent_school_change();
create trigger students_prevent_school_change before update on public.students
for each row execute function public.prevent_school_change();
create trigger guardian_links_prevent_school_change before update on public.guardian_links
for each row execute function public.prevent_school_change();
create trigger grades_prevent_school_change before update on public.grades
for each row execute function public.prevent_school_change();
create trigger attendance_prevent_school_change before update on public.attendance
for each row execute function public.prevent_school_change();
create trigger fees_prevent_school_change before update on public.fees
for each row execute function public.prevent_school_change();
create trigger payments_prevent_school_change before update on public.payments
for each row execute function public.prevent_school_change();
create trigger announcements_prevent_school_change before update on public.announcements
for each row execute function public.prevent_school_change();
create trigger announcement_targets_prevent_school_change before update on public.announcement_targets
for each row execute function public.prevent_school_change();
create trigger notifications_prevent_school_change before update on public.notifications
for each row execute function public.prevent_school_change();

create trigger guardian_links_validate before insert or update on public.guardian_links
for each row execute function public.validate_guardian_link();
create trigger guardian_links_protect_identity before update on public.guardian_links
for each row execute function public.prevent_guardian_identity_change();
create trigger attendance_validate_context before insert or update on public.attendance
for each row execute function public.validate_attendance_context();
create trigger attendance_protect_identity before update on public.attendance
for each row execute function public.prevent_attendance_identity_change();
create trigger grades_set_publication before insert or update on public.grades
for each row execute function public.set_grade_publication();
create trigger grades_protect_grader before update on public.grades
for each row execute function public.prevent_graded_by_change();
create trigger grades_protect_identity before update on public.grades
for each row execute function public.prevent_grade_identity_change();
create trigger attendance_protect_recorder before update on public.attendance
for each row execute function public.prevent_recorded_by_change();
create trigger payments_validate before insert on public.payments
for each row execute function public.validate_payment();
create trigger fees_validate_update before update on public.fees
for each row execute function public.validate_fee_update();
create trigger fees_protect_created_by before update on public.fees
for each row execute function public.prevent_created_by_change();
create trigger announcements_protect_created_by before update on public.announcements
for each row execute function public.prevent_created_by_change();
create trigger announcements_set_publication before update on public.announcements
for each row execute function public.set_announcement_publication();
create trigger announcement_targets_validate_change
before insert or update or delete on public.announcement_targets
for each row execute function public.validate_announcement_target_change();
