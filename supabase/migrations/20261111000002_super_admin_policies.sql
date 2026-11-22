-- Étape 6 — Rôle de supervision globale : profil transverse et politiques RLS.
--
-- Le rôle `super_admin` supervise l'ensemble des écoles de la plateforme :
-- il n'appartient donc à aucune école (`school_id` nul) et dispose de
-- politiques de LECTURE seule sur toutes les tables métier.
--
-- Isolation stricte :
--  - aucune politique d'écriture n'est créée pour ce rôle : la supervision
--    ne modifie aucune donnée ;
--  - les politiques par école restent inchangées : un rôle d'école ne voit
--    toujours que sa propre école, et un parent que ses enfants liés ;
--  - le rôle est désactivable (`is_active`) : le helper `is_super_admin`
--    refuse alors tout accès.

-- Le rôle de supervision globale n'appartient à aucune école : `school_id`
-- devient nullable pour lui seul.
alter table public.profiles alter column school_id drop not null;

alter table public.profiles
  add constraint profiles_school_required_unless_super_admin
  check (role = 'super_admin' or school_id is not null);

-- Helper interne : lit uniquement le profil de l'utilisateur du JWT.
-- Comme les autres helpers RLS, il ne dépend pas du schéma Auth : il relit
-- les claims publics de la requête (`request.jwt.claim.sub`).
grant school_manage_internal to postgres;
grant usage, create on schema public to school_manage_internal;

create or replace function public.is_super_admin()
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
    where profile.id = (
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
    )
      and profile.role = 'super_admin'
      and profile.is_active
  );
$$;

alter function public.is_super_admin() owner to school_manage_internal;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Politiques de supervision : lecture seule, toutes écoles confondues.
create policy schools_select_super_admin
on public.schools for select to authenticated
using (public.is_super_admin());

create policy profiles_select_super_admin
on public.profiles for select to authenticated
using (public.is_super_admin());

create policy classes_select_super_admin
on public.classes for select to authenticated
using (public.is_super_admin());

create policy subjects_select_super_admin
on public.subjects for select to authenticated
using (public.is_super_admin());

create policy periods_select_super_admin
on public.periods for select to authenticated
using (public.is_super_admin());

create policy students_select_super_admin
on public.students for select to authenticated
using (public.is_super_admin());

create policy guardian_links_select_super_admin
on public.guardian_links for select to authenticated
using (public.is_super_admin());

create policy grades_select_super_admin
on public.grades for select to authenticated
using (public.is_super_admin());

create policy attendance_select_super_admin
on public.attendance for select to authenticated
using (public.is_super_admin());

create policy fees_select_super_admin
on public.fees for select to authenticated
using (public.is_super_admin());

create policy payments_select_super_admin
on public.payments for select to authenticated
using (public.is_super_admin());

create policy announcements_select_super_admin
on public.announcements for select to authenticated
using (public.is_super_admin());

create policy announcement_targets_select_super_admin
on public.announcement_targets for select to authenticated
using (public.is_super_admin());

create policy notifications_select_super_admin
on public.notifications for select to authenticated
using (public.is_super_admin());

create policy audit_log_select_super_admin
on public.audit_log for select to authenticated
using (public.is_super_admin());

-- Aucune appartenance administrative permanente.
revoke create on schema public from school_manage_internal;
revoke school_manage_internal from postgres;
