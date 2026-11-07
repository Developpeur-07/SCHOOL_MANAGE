-- Étape 2 — Politiques RLS, privilèges minimaux et audit soumis à RLS.
-- Le rôle interne ne peut pas se connecter et ne peut pas contourner RLS.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'school_manage_internal') then
    create role school_manage_internal nologin noinherit nobypassrls;
  end if;
end;
$$;

alter role school_manage_internal nologin noinherit nobypassrls;
revoke all on schema public from school_manage_internal;
grant usage on schema public to school_manage_internal;
grant select on public.profiles to school_manage_internal;
grant insert on public.audit_log to school_manage_internal;
grant usage on schema auth to school_manage_internal;
grant execute on function auth.uid() to school_manage_internal;

-- Les helpers internes ne lisent que le profil de l’utilisateur du JWT. Cette
-- politique ne concerne pas authenticated/anon et ne désactive pas RLS.
create policy profiles_internal_read
on public.profiles for select
to school_manage_internal
using (id = (select auth.uid()));

create policy audit_log_internal_insert
on public.audit_log for insert
to school_manage_internal
with check (school_id is not null);

create or replace function public.is_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = on
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.school_id = target_school_id
      and profile.is_active
  );
$$;

create or replace function public.has_school_role(
  target_school_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = on
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.school_id = target_school_id
      and profile.role = any(allowed_roles)
      and profile.is_active
  );
$$;

alter function public.is_school_member(uuid) owner to school_manage_internal;
alter function public.has_school_role(uuid, public.app_role[]) owner to school_manage_internal;
revoke all on function public.is_school_member(uuid) from public;
revoke all on function public.has_school_role(uuid, public.app_role[]) from public;
grant execute on function public.is_school_member(uuid) to authenticated;
grant execute on function public.has_school_role(uuid, public.app_role[]) to authenticated;

-- Tenant et profils.
create policy schools_select_member
on public.schools for select to authenticated
using (public.is_school_member(id));
create policy schools_update_direction
on public.schools for update to authenticated
using (public.has_school_role(id, array['direction']::public.app_role[]))
with check (public.has_school_role(id, array['direction']::public.app_role[]));

create policy profiles_select_own_or_administrative_staff
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_school_role(
    school_id,
    array['direction', 'secretary', 'accountant']::public.app_role[]
  )
);

-- Référentiel scolaire : les noms de classes/matères/périodes sont visibles
-- par les membres de l’école ; les données d’élèves ont des politiques plus strictes.
create policy classes_select_member
on public.classes for select to authenticated
using (public.is_school_member(school_id));
create policy classes_insert_management
on public.classes for insert to authenticated
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));
create policy classes_update_management
on public.classes for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));

create policy subjects_select_member
on public.subjects for select to authenticated
using (public.is_school_member(school_id));
create policy subjects_insert_management
on public.subjects for insert to authenticated
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));
create policy subjects_update_management
on public.subjects for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));

create policy periods_select_member
on public.periods for select to authenticated
using (public.is_school_member(school_id));
create policy periods_insert_management
on public.periods for insert to authenticated
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));
create policy periods_update_management
on public.periods for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));

-- Élèves et liens tuteurs.
create policy students_select_staff_or_linked_parent
on public.students for select to authenticated
using (
  public.has_school_role(
    school_id,
    array['direction', 'secretary', 'accountant', 'teacher', 'supervisor']::public.app_role[]
  )
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and exists (
      select 1
      from public.guardian_links as link
      where link.school_id = students.school_id
        and link.student_id = students.id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy students_insert_management
on public.students for insert to authenticated
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));
create policy students_update_management
on public.students for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));

create policy guardian_links_select_own_or_management
on public.guardian_links for select to authenticated
using (
  (
    guardian_id = (select auth.uid())
    and public.has_school_role(school_id, array['parent']::public.app_role[])
  )
  or public.has_school_role(
    school_id,
    array['direction', 'secretary', 'accountant']::public.app_role[]
  )
);
create policy guardian_links_insert_management
on public.guardian_links for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.profiles as profile
    where profile.id = guardian_id
      and profile.school_id = guardian_links.school_id
      and profile.role = 'parent'
      and profile.is_active
  )
);
create policy guardian_links_update_management
on public.guardian_links for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.profiles as profile
    where profile.id = guardian_id
      and profile.school_id = guardian_links.school_id
      and profile.role = 'parent'
      and profile.is_active
  )
);

-- Notes : le parent ne voit que les notes publiées de ses enfants.
create policy grades_select_staff_or_linked_parent
on public.grades for select to authenticated
using (
  public.has_school_role(school_id, array['direction', 'teacher']::public.app_role[])
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and status = 'published'
    and exists (
      select 1 from public.guardian_links as link
      where link.school_id = grades.school_id
        and link.student_id = grades.student_id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy grades_insert_teaching_staff
on public.grades for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'teacher']::public.app_role[])
  and graded_by = (select auth.uid())
);
create policy grades_update_teaching_staff
on public.grades for update to authenticated
using (public.has_school_role(school_id, array['direction', 'teacher']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'teacher']::public.app_role[]));

-- Présences.
create policy attendance_select_staff_or_linked_parent
on public.attendance for select to authenticated
using (
  public.has_school_role(
    school_id,
    array['direction', 'secretary', 'teacher', 'supervisor']::public.app_role[]
  )
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and exists (
      select 1 from public.guardian_links as link
      where link.school_id = attendance.school_id
        and link.student_id = attendance.student_id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy attendance_insert_school_life_staff
on public.attendance for insert to authenticated
with check (
  public.has_school_role(
    school_id,
    array['direction', 'secretary', 'teacher', 'supervisor']::public.app_role[]
  )
  and recorded_by = (select auth.uid())
);
create policy attendance_update_school_life_staff
on public.attendance for update to authenticated
using (public.has_school_role(
  school_id,
  array['direction', 'secretary', 'teacher', 'supervisor']::public.app_role[]
))
with check (public.has_school_role(
  school_id,
  array['direction', 'secretary', 'teacher', 'supervisor']::public.app_role[]
));

-- Finances : un parent lit uniquement les frais/reçus de ses enfants.
create policy fees_select_finance_staff_or_linked_parent
on public.fees for select to authenticated
using (
  public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[])
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and exists (
      select 1 from public.guardian_links as link
      where link.school_id = fees.school_id
        and link.student_id = fees.student_id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy fees_insert_finance_staff
on public.fees for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[])
  and created_by = (select auth.uid())
);
create policy fees_update_finance_staff
on public.fees for update to authenticated
using (public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[]));

create policy payments_select_finance_staff_or_linked_parent
on public.payments for select to authenticated
using (
  public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[])
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and exists (
      select 1 from public.guardian_links as link
      where link.school_id = payments.school_id
        and link.student_id = payments.student_id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy payments_insert_finance_staff
on public.payments for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'accountant']::public.app_role[])
  and received_by = (select auth.uid())
);

-- Annonces : le personnel prépare les brouillons et cibles. Le parent lit une
-- annonce publiée seulement s’il possède une notification destinataire pour un
-- enfant encore lié. Cela prépare le cliché de diffusion sans exposer les cibles.
create policy announcements_select_staff_or_notified_parent
on public.announcements for select to authenticated
using (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and status = 'published'
    and exists (
      select 1 from public.notifications as notification
      where notification.school_id = announcements.school_id
        and notification.announcement_id = announcements.id
        and notification.recipient_id = (select auth.uid())
        and exists (
          select 1 from public.guardian_links as link
          where link.school_id = notification.school_id
            and link.student_id = notification.student_id
            and link.guardian_id = (select auth.uid())
            and link.is_active
        )
    )
  )
);
create policy announcements_insert_management
on public.announcements for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and created_by = (select auth.uid())
  and status = 'draft'
);
create policy announcements_update_management
on public.announcements for update to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]))
with check (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));

create policy announcement_targets_select_management
on public.announcement_targets for select to authenticated
using (public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[]));
create policy announcement_targets_insert_management
on public.announcement_targets for insert to authenticated
with check (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.announcements as announcement
    where announcement.id = announcement_id
      and announcement.school_id = announcement_targets.school_id
      and announcement.status = 'draft'
  )
);
create policy announcement_targets_update_management
on public.announcement_targets for update to authenticated
using (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.announcements as announcement
    where announcement.id = announcement_id
      and announcement.school_id = announcement_targets.school_id
      and announcement.status = 'draft'
  )
)
with check (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.announcements as announcement
    where announcement.id = announcement_id
      and announcement.school_id = announcement_targets.school_id
      and announcement.status = 'draft'
  )
);
create policy announcement_targets_delete_management
on public.announcement_targets for delete to authenticated
using (
  public.has_school_role(school_id, array['direction', 'secretary']::public.app_role[])
  and exists (
    select 1 from public.announcements as announcement
    where announcement.id = announcement_id
      and announcement.school_id = announcement_targets.school_id
      and announcement.status = 'draft'
  )
);

-- Centre de notifications et reçus de lecture.
create policy notifications_select_recipient_or_direction
on public.notifications for select to authenticated
using (
  public.has_school_role(school_id, array['direction']::public.app_role[])
  or (
    public.has_school_role(school_id, array['parent']::public.app_role[])
    and recipient_id = (select auth.uid())
    and exists (
      select 1 from public.guardian_links as link
      where link.school_id = notifications.school_id
        and link.student_id = notifications.student_id
        and link.guardian_id = (select auth.uid())
        and link.is_active
    )
  )
);
create policy notifications_update_read_at
on public.notifications for update to authenticated
using (
  public.has_school_role(school_id, array['parent']::public.app_role[])
  and recipient_id = (select auth.uid())
  and exists (
    select 1 from public.guardian_links as link
    where link.school_id = notifications.school_id
      and link.student_id = notifications.student_id
      and link.guardian_id = (select auth.uid())
      and link.is_active
  )
)
with check (
  public.has_school_role(school_id, array['parent']::public.app_role[])
  and recipient_id = (select auth.uid())
  and exists (
    select 1 from public.guardian_links as link
    where link.school_id = notifications.school_id
      and link.student_id = notifications.student_id
      and link.guardian_id = (select auth.uid())
      and link.is_active
  )
);

-- Seule la direction consulte le journal de son école. Aucun rôle applicatif
-- ne peut le modifier, le supprimer ou y écrire directement.
create policy audit_log_select_direction
on public.audit_log for select to authenticated
using (public.has_school_role(school_id, array['direction']::public.app_role[]));

-- Privilèges : la RLS complète les privilèges, elle ne les remplace pas.
revoke all on table public.schools from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.classes from anon, authenticated;
revoke all on table public.subjects from anon, authenticated;
revoke all on table public.periods from anon, authenticated;
revoke all on table public.students from anon, authenticated;
revoke all on table public.guardian_links from anon, authenticated;
revoke all on table public.grades from anon, authenticated;
revoke all on table public.attendance from anon, authenticated;
revoke all on table public.fees from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.announcements from anon, authenticated;
revoke all on table public.announcement_targets from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;

grant select on table public.schools, public.profiles, public.classes, public.subjects,
  public.periods, public.students, public.guardian_links, public.grades, public.attendance,
  public.fees, public.payments, public.announcements, public.announcement_targets,
  public.notifications, public.audit_log to authenticated;
grant insert on table public.classes, public.subjects, public.periods,
  public.students, public.guardian_links, public.grades, public.attendance, public.fees,
  public.announcements, public.payments to authenticated;
grant insert, delete on table public.announcement_targets to authenticated;

-- Seconde barrière après RLS et triggers : les colonnes techniques, d’identité
-- et de publication ne sont pas modifiables directement par l’API.
grant update (name, slug, timezone, locale, currency_code)
  on table public.schools to authenticated;
grant update (school_year, name, level)
  on table public.classes to authenticated;
grant update (code, name)
  on table public.subjects to authenticated;
grant update (school_year, name, starts_on, ends_on)
  on table public.periods to authenticated;
grant update (class_id, student_code, first_name, last_name)
  on table public.students to authenticated;
grant update (relationship_label, is_active, starts_on, ended_on)
  on table public.guardian_links to authenticated;
grant update (evaluation_label, score, max_score, status)
  on table public.grades to authenticated;
grant update (status, comment)
  on table public.attendance to authenticated;
grant update (label, amount_minor, due_on)
  on table public.fees to authenticated;
grant update (title, body, status)
  on table public.announcements to authenticated;
grant update (target_type, class_id, student_id)
  on table public.announcement_targets to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Audit générique : seuls les noms de colonnes changées sont conservés, jamais
-- les anciennes/nouvelles valeurs. audit_log a déjà ENABLE + FORCE RLS ; le
-- rôle interne, non propriétaire et NOBYPASSRLS, reste soumis à ses politiques.
create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = on
as $$
declare
  row_data jsonb;
  audit_school_id uuid;
  audit_entity_id uuid;
  fields text[];
begin
  -- set_updated_at laisse NEW identique à OLD pour un UPDATE sans changement.
  -- Sortir avant toute conversion JSONB évite alors le coût d’audit inutile.
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;

  if tg_op = 'DELETE' then
    row_data = to_jsonb(old);
  else
    row_data = to_jsonb(new);
  end if;

  audit_entity_id = (row_data ->> 'id')::uuid;
  if tg_table_name = 'schools' then
    audit_school_id = audit_entity_id;
  else
    audit_school_id = (row_data ->> 'school_id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(changed.key order by changed.key), '{}')
    into fields
    from (
      select new_values.key
      from jsonb_each(to_jsonb(new)) as new_values
      join jsonb_each(to_jsonb(old)) as old_values using (key)
      where new_values.value is distinct from old_values.value
    ) as changed;
  else
    select coalesce(array_agg(all_values.key order by all_values.key), '{}')
    into fields
    from jsonb_each(row_data) as all_values;
  end if;

  insert into public.audit_log (
    school_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    changed_fields
  ) values (
    audit_school_id,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    audit_entity_id,
    fields
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function public.audit_business_change() owner to school_manage_internal;
revoke all on function public.audit_business_change() from public;

create trigger schools_audit after insert or update or delete on public.schools
for each row execute function public.audit_business_change();
create trigger profiles_audit after insert or update or delete on public.profiles
for each row execute function public.audit_business_change();
create trigger classes_audit after insert or update or delete on public.classes
for each row execute function public.audit_business_change();
create trigger subjects_audit after insert or update or delete on public.subjects
for each row execute function public.audit_business_change();
create trigger periods_audit after insert or update or delete on public.periods
for each row execute function public.audit_business_change();
create trigger students_audit after insert or update or delete on public.students
for each row execute function public.audit_business_change();
create trigger guardian_links_audit after insert or update or delete on public.guardian_links
for each row execute function public.audit_business_change();
create trigger grades_audit after insert or update or delete on public.grades
for each row execute function public.audit_business_change();
create trigger attendance_audit after insert or update or delete on public.attendance
for each row execute function public.audit_business_change();
create trigger fees_audit after insert or update or delete on public.fees
for each row execute function public.audit_business_change();
create trigger payments_audit after insert or update or delete on public.payments
for each row execute function public.audit_business_change();
create trigger announcements_audit after insert or update or delete on public.announcements
for each row execute function public.audit_business_change();
create trigger announcement_targets_audit after insert or update or delete on public.announcement_targets
for each row execute function public.audit_business_change();
create trigger notifications_audit after insert or update or delete on public.notifications
for each row execute function public.audit_business_change();
