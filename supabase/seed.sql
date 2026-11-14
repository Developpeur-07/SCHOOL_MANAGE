-- DONNÉES LOCALES UNIQUEMENT — tous les noms et identifiants sont fictifs.
-- À exécuter après les migrations sur une base locale vide (supabase db reset).
-- Aucun mot de passe utilisable n’est seedé : le provisionnement de connexion
-- sera réalisé via Supabase Auth à l’étape 3.

create or replace function pg_temp.seed_auth_user(
  user_id uuid,
  user_email text,
  display_name text
)
returns void
language sql
set search_path = ''
as $$
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    user_email,
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', display_name, 'demo', true),
    now(),
    now()
  );
$$;

-- Profils Auth : adresses dans le domaine réservé .invalid.
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000001', 'direction.a@example.invalid', 'Direction Démo A');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000002', 'secretariat.a@example.invalid', 'Secrétariat Démo A');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000003', 'comptable.a@example.invalid', 'Comptable Démo A');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000004', 'enseignant.a@example.invalid', 'Enseignant Démo A');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000005', 'surveillant.a@example.invalid', 'Surveillant Démo A');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000010', 'parent.a1@example.invalid', 'Parent Démo A1');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000011', 'parent.a2@example.invalid', 'Parent Démo A2');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000012', 'parent.a3@example.invalid', 'Parent Démo A3');
select pg_temp.seed_auth_user('a0000000-0000-4000-8000-000000000013', 'parent.a0@example.invalid', 'Parent Démo Sans Lien');
select pg_temp.seed_auth_user('b0000000-0000-4000-8000-000000000001', 'direction.b@example.invalid', 'Direction Démo B');
select pg_temp.seed_auth_user('b0000000-0000-4000-8000-000000000003', 'comptable.b@example.invalid', 'Comptable Démo B');
select pg_temp.seed_auth_user('b0000000-0000-4000-8000-000000000004', 'enseignant.b@example.invalid', 'Enseignant Démo B');
select pg_temp.seed_auth_user('b0000000-0000-4000-8000-000000000010', 'parent.b1@example.invalid', 'Parent Démo B1');
-- Compte de supervision globale : il n'appartient à aucune école.
select pg_temp.seed_auth_user('c0000000-0000-4000-8000-000000000001', 'supervision@example.invalid', 'Supervision Démo');

insert into public.schools (id, name, slug, timezone, locale, currency_code) values
  ('10000000-0000-4000-8000-000000000001', 'École entièrement fictive A', 'ecole-fictive-a', 'Africa/Brazzaville', 'fr-CG', 'XAF'),
  ('20000000-0000-4000-8000-000000000002', 'École entièrement fictive B', 'ecole-fictive-b', 'Africa/Brazzaville', 'fr-CG', 'XAF');

insert into public.profiles (id, school_id, role, full_name, phone) values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'direction', 'Direction Démo A', '+242060000001'),
  ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'secretary', 'Secrétariat Démo A', '+242060000002'),
  ('a0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'accountant', 'Comptable Démo A', '+242060000003'),
  ('a0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'teacher', 'Enseignant Démo A', '+242060000004'),
  ('a0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'supervisor', 'Surveillant Démo A', '+242060000005'),
  ('a0000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'parent', 'Parent Démo A1', '+242060000010'),
  ('a0000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'parent', 'Parent Démo A2', '+242060000011'),
  ('a0000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'parent', 'Parent Démo A3', '+242060000012'),
  ('a0000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'parent', 'Parent Démo Sans Lien', null),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'direction', 'Direction Démo B', '+242070000001'),
  ('b0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'accountant', 'Comptable Démo B', '+242070000003'),
  ('b0000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'teacher', 'Enseignant Démo B', '+242070000004'),
  ('b0000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000002', 'parent', 'Parent Démo B1', '+242070000010'),
  ('c0000000-0000-4000-8000-000000000001', null, 'super_admin', 'Supervision Démo', null);

insert into public.classes (id, school_id, school_year, name, level) values
  ('12000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-2027', 'Classe Démo A1', 'Sixième fictive'),
  ('12000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '2026-2027', 'Classe Démo A2', 'Cinquième fictive'),
  ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2026-2027', 'Classe Démo B1', 'Sixième fictive');

insert into public.subjects (id, school_id, code, name) values
  ('13000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'MATH_DEMO', 'Mathématiques fictives'),
  ('13000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'FR_DEMO', 'Français fictif'),
  ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'MATH_DEMO', 'Mathématiques fictives B');

insert into public.periods (id, school_id, school_year, name, starts_on, ends_on) values
  ('14000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-2027', 'Trimestre Démo 1', '2026-09-01', '2026-12-20'),
  ('24000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2026-2027', 'Trimestre Démo B1', '2026-09-01', '2026-12-20');

insert into public.students (id, school_id, class_id, student_code, first_name, last_name) values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'ELEVE-DEMO-A1', 'Enfant-Démo-A1', 'Fictif'),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000002', 'ELEVE-DEMO-A2', 'Enfant-Démo-A2', 'Fictif'),
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'ELEVE-DEMO-A3', 'Enfant-Démo-A3', 'Fictif'),
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'ELEVE-DEMO-B1', 'Enfant-Démo-B1', 'Fictif');

insert into public.guardian_links (
  id, school_id, guardian_id, student_id, relationship_label, is_active, starts_on
) values
  ('15000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', 'Tuteur fictif 1', true, '2026-09-01'),
  ('15000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000002', 'Tuteur fictif 1', true, '2026-09-01'),
  ('15000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000002', 'Tuteur fictif 2', true, '2026-09-01'),
  ('15000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000003', 'Tuteur fictif 3', true, '2026-09-01'),
  ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000010', '21000000-0000-4000-8000-000000000001', 'Tuteur fictif B', true, '2026-09-01');

insert into public.grades (
  id, school_id, student_id, subject_id, period_id, evaluation_label,
  score, max_score, status, graded_by
) values
  ('16000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'Devoir fictif A1', 14.5, 20, 'published', 'a0000000-0000-4000-8000-000000000004'),
  ('16000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', 'Devoir fictif A2', 12, 20, 'published', 'a0000000-0000-4000-8000-000000000004'),
  ('16000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'Devoir fictif A3', 9, 20, 'published', 'a0000000-0000-4000-8000-000000000004'),
  ('16000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', 'Brouillon fictif A3', 11, 20, 'draft', 'a0000000-0000-4000-8000-000000000004'),
  ('26000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'Devoir fictif B1', 15, 20, 'published', 'b0000000-0000-4000-8000-000000000004');

insert into public.attendance (
  id, school_id, student_id, class_id, attendance_date, status, comment, recorded_by
) values
  ('17000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '2026-11-06', 'absent', 'Absence fictive de test', 'a0000000-0000-4000-8000-000000000005'),
  ('17000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '2026-11-06', 'present', null, 'a0000000-0000-4000-8000-000000000005'),
  ('17000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', '2026-11-06', 'late', 'Retard fictif de test', 'a0000000-0000-4000-8000-000000000005'),
  ('27000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '2026-11-06', 'present', null, 'b0000000-0000-4000-8000-000000000004');

insert into public.fees (
  id, school_id, student_id, label, amount_minor, due_on, created_by
) values
  ('18000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Frais fictifs A1', 50000, '2026-11-01', 'a0000000-0000-4000-8000-000000000003'),
  ('18000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'Frais fictifs A2 soldés', 30000, '2026-11-01', 'a0000000-0000-4000-8000-000000000003'),
  ('18000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'Frais fictifs A3 impayés', 20000, '2026-11-01', 'a0000000-0000-4000-8000-000000000003'),
  ('28000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'Frais fictifs B1', 25000, '2026-11-01', 'b0000000-0000-4000-8000-000000000003');

insert into public.payments (
  id, school_id, fee_id, student_id, amount_minor, paid_at, payment_method, receipt_number, received_by, note
) values
  ('19000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 20000, '2026-11-02T09:00:00Z', 'cash', 'REC-DEMO-A1', 'a0000000-0000-4000-8000-000000000003', 'Paiement fictif partiel'),
  ('19000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 30000, '2026-11-02T10:00:00Z', 'bank_transfer', 'REC-DEMO-A2', 'a0000000-0000-4000-8000-000000000003', 'Paiement fictif complet'),
  ('29000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 15000, '2026-11-02T11:00:00Z', 'cash', 'REC-DEMO-B1', 'b0000000-0000-4000-8000-000000000003', 'Paiement fictif B');

insert into public.announcements (
  id, school_id, title, body, status, created_by, published_by, published_at
) values
  ('1a000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Annonce fictive générale A', 'Contenu entièrement fictif pour toute l’école A.', 'draft', 'a0000000-0000-4000-8000-000000000002', null, null),
  ('1a000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Annonce fictive élève A1', 'Contenu fictif ciblant uniquement l’élève A1.', 'draft', 'a0000000-0000-4000-8000-000000000002', null, null),
  ('1a000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Annonce fictive impayés A', 'Contenu fictif destiné aux tuteurs ayant un impayé.', 'draft', 'a0000000-0000-4000-8000-000000000002', null, null),
  ('1a000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Annonce fictive classe A2', 'Contenu fictif destiné à la classe A2.', 'draft', 'a0000000-0000-4000-8000-000000000002', null, null),
  ('1a000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Brouillon fictif A', 'Brouillon invisible pour les parents.', 'draft', 'a0000000-0000-4000-8000-000000000002', null, null),
  ('2a000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Annonce fictive générale B', 'Contenu entièrement fictif pour l’école B.', 'draft', 'b0000000-0000-4000-8000-000000000001', null, null);

insert into public.announcement_targets (
  id, school_id, announcement_id, target_type, class_id, student_id
) values
  ('1b000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000001', 'whole_school', null, null),
  ('1b000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002', 'student', null, '11000000-0000-4000-8000-000000000001'),
  ('1b000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000003', 'overdue', null, null),
  ('1b000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000004', 'class', '12000000-0000-4000-8000-000000000002', null),
  ('2b000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000001', 'whole_school', null, null);

-- Publication après création des cibles, comme dans le parcours applicatif.
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
update public.announcements
set status = 'published'
where id in (
  '1a000000-0000-4000-8000-000000000001',
  '1a000000-0000-4000-8000-000000000002',
  '1a000000-0000-4000-8000-000000000003',
  '1a000000-0000-4000-8000-000000000004'
);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', false);
update public.announcements
set status = 'published'
where id = '2a000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '', false);

insert into public.notifications (
  id, school_id, recipient_id, student_id, announcement_id, event_type,
  source_id, title, body, read_at
) values
  ('1c000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000001', 'announcement_published', '1a000000-0000-4000-8000-000000000001', 'Annonce fictive générale A', 'Notification fictive pour A1.', null),
  ('1c000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000001', 'announcement_published', '1a000000-0000-4000-8000-000000000001', 'Annonce fictive générale A', 'Notification fictive pour A2.', null),
  ('1c000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000001', 'announcement_published', '1a000000-0000-4000-8000-000000000001', 'Annonce fictive générale A', 'Notification fictive du second tuteur.', null),
  ('1c000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000003', '1a000000-0000-4000-8000-000000000001', 'announcement_published', '1a000000-0000-4000-8000-000000000001', 'Annonce fictive générale A', 'Notification fictive pour A3.', null),
  ('1c000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002', 'announcement_published', '1a000000-0000-4000-8000-000000000002', 'Annonce fictive élève A1', 'Notification fictive ciblée.', null),
  ('1c000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000003', 'announcement_published', '1a000000-0000-4000-8000-000000000003', 'Annonce fictive impayés A', 'Notification fictive d’impayé A1.', null),
  ('1c000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000003', '1a000000-0000-4000-8000-000000000003', 'announcement_published', '1a000000-0000-4000-8000-000000000003', 'Annonce fictive impayés A', 'Notification fictive d’impayé A3.', null),
  ('1c000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000004', 'announcement_published', '1a000000-0000-4000-8000-000000000004', 'Annonce fictive classe A2', 'Notification fictive de classe.', null),
  ('1c000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000004', 'announcement_published', '1a000000-0000-4000-8000-000000000004', 'Annonce fictive classe A2', 'Notification fictive du second tuteur.', null),
  ('1c000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', null, 'payment_recorded', '19000000-0000-4000-8000-000000000001', 'Paiement fictif A1', 'Reçu fictif REC-DEMO-A1.', null),
  ('1c000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000002', null, 'payment_recorded', '19000000-0000-4000-8000-000000000002', 'Paiement fictif A2', 'Reçu fictif REC-DEMO-A2.', null),
  ('2c000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000010', '21000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', 'announcement_published', '2a000000-0000-4000-8000-000000000001', 'Annonce fictive générale B', 'Notification fictive B1.', null);

-- ── Compatibilité de connexion (miroir local de la migration 20261110000001) ──
-- GoTrue charge `auth.users` dans un modèle où `email_change`,
-- `confirmation_token`, `recovery_token`, `email_change_token_current`,
-- `email_change_token_new`, `phone_change_token` et `reauthentication_token`
-- sont des chaînes NON nullables. Une valeur NULL fait échouer le scan et
-- renvoie un 500 « Database error querying schema » sur TOUTE connexion.
-- Le bloc est conditionnel : la base de test PGlite fournit une auth.users
-- minimale, sans ces colonnes.
do $$
declare
  colonnes_jeton integer;
begin
  select count(*) into colonnes_jeton
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'users'
    and column_name in (
      'confirmation_token',
      'recovery_token',
      'email_change_token_current',
      'email_change_token_new',
      'email_change',
      'phone_change_token',
      'reauthentication_token'
    );

  if colonnes_jeton = 7 then
    update auth.users
    set confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        reauthentication_token = coalesce(reauthentication_token, '');

    raise notice 'Jetons de auth.users normalisés.';
  else
    raise notice 'Colonnes de jeton absentes de auth.users : normalisation ignorée.';
  end if;
end;
$$;
