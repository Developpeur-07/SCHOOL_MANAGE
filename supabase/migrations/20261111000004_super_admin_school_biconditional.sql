-- Étape 6 (complément) — biconditionnalité stricte du rôle de supervision.
--
-- La contrainte précédente n'imposait qu'un seul sens :
--   `role = 'super_admin' or school_id is not null`
-- c'est-à-dire « toute école manquante implique un rôle de supervision ».
-- Elle laissait en revanche un rôle `super_admin` rattaché à une école.
--
-- Le modèle retenu est une biconditionnalité :
--   le rôle de supervision globale  <=>  aucune école de rattachement.
-- Un `super_admin` ne peut donc pas être rattaché à une école, et un profil
-- sans école ne peut être qu'un `super_admin`. La RLS et l'application
-- s'appuient sur cette équivalence ; elle doit donc être garantie par la
-- base elle-même, pas seulement par le code applicatif.

alter table public.profiles
  drop constraint if exists profiles_school_required_unless_super_admin;

alter table public.profiles
  add constraint profiles_school_matches_super_admin
  check ((role = 'super_admin') = (school_id is null));
