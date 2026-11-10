-- Compatibilité de connexion (Supabase Auth / GoTrue)
--
-- GoTrue charge la ligne `auth.users` dans son modèle `models.User`. Plusieurs
-- colonnes y sont déclarées comme des chaînes Go simples, donc NON nullables :
--
--   confirmation_token, recovery_token, email_change_token_current,
--   email_change_token_new, email_change, phone_change_token,
--   reauthentication_token
--
-- Si l'une d'elles vaut NULL en base, le scan SQL échoue
-- (« converting NULL to string is unsupported »). L'erreur remonte jusqu'à
-- `models.FindUserByEmailAndAudience` et l'API Auth renvoie alors
-- HTTP 500 « Database error querying schema » pour TOUTE tentative de
-- connexion, quel que soit le couple identifiants / mot de passe.
--
-- Les comptes provisionnés par insertion SQL directe (seed, jeu de démo)
-- laissent ces colonnes à NULL : la connexion est donc impossible tant que
-- la normalisation n'a pas été appliquée.
--
-- La migration ne modifie que ces colonnes : aucun e-mail, mot de passe,
-- profil, rôle, école ou lien n'est touché. Les NULLs sont remplacés par une
-- chaîne vide, exactement comme le fait GoTrue pour un compte créé par lui.
--
-- Le bloc est conditionnel : les colonnes de jeton n'existent pas dans toutes
-- les installations (par exemple la base de test PGlite, qui fournit une
-- auth.users minimale).

do $$
declare
  colonnes_jeton integer;
  remaining integer;
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

  if colonnes_jeton < 7 then
    raise notice 'Colonnes de jeton absentes de auth.users : normalisation ignorée.';
    return;
  end if;

  update auth.users
  set confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, ''),
      phone_change_token = coalesce(phone_change_token, ''),
      reauthentication_token = coalesce(reauthentication_token, '');

  select count(*) into remaining
  from auth.users
  where confirmation_token is null
     or recovery_token is null
     or email_change_token_current is null
     or email_change_token_new is null
     or email_change is null
     or phone_change_token is null
     or reauthentication_token is null;

  if remaining > 0 then
    raise warning 'Normalisation des jetons incomplète : % ligne(s) avec NULL (droits ou RLS insuffisants).', remaining;
  else
    raise notice 'Jetons de auth.users normalisés : aucune valeur NULL restante.';
  end if;
end;
$$;
