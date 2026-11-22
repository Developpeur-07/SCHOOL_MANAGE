-- Étape 6 — Rôle de supervision globale.
--
-- L'ajout d'une valeur d'énumération est isolé dans son propre fichier :
-- PostgreSQL n'autorise pas l'usage d'une nouvelle valeur d'énumération dans
-- la transaction qui l'a créée. Les politiques RLS qui la référencent sont
-- donc appliquées dans le fichier suivant.

alter type public.app_role add value if not exists 'super_admin';
