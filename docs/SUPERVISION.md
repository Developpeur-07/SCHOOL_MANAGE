# Supervision globale du management (étape 6)

Ce document décrit la supervision globale livrée à l’étape 6 : le rôle
`super_admin`, la page `/supervision`, le modèle d’isolation appliqué et les
tests qui le couvrent.

La supervision est **strictement consultative** : elle lit les données de
toutes les écoles de la plateforme et n’en modifie aucune. Elle n’ajoute
aucune capacité de gestion métier au parent, qui reste en lecture seule.

---

## 1. Périmètre

| Élément | Description |
| --- | --- |
| Rôle applicatif | `super_admin` (`public.app_role`), transverse : il n’appartient à **aucune** école |
| Route | `/supervision` |
| Zone applicative | `admin` (`RoleArea`), distincte de `parent`, `school` et `teacher` |
| Accueil après connexion | `/supervision` (via `getRoleHomePath`) |
| Politiques RLS | 15 politiques `*_select_super_admin`, **lecture seule** |
| Écriture | Aucune : ni politique `INSERT`/`UPDATE`/`DELETE` pour ce rôle |

## 2. Pourquoi un profil transverse

Un superviseur suit plusieurs écoles. Le rattacher à l’une d’elles aurait deux
conséquences fautives : il ne verrait pas les autres, et il apparaîtrait dans
la liste des personnels de cette école.

Le profil de supervision est donc créé avec `school_id = null`. La contrainte
`profiles_school_matches_super_admin` impose la **biconditionnalité** : le rôle
de supervision globale et l’absence d’école de rattachement vont de pair.

```sql
check ((role = 'super_admin') = (school_id is null))
```

Autrement dit :

- un `super_admin` ne peut pas être rattaché à une école, même par une
  modification ultérieure ;
- un profil sans école ne peut être qu’un `super_admin`.

Cette équivalence est garantie par la base, et non par le seul code
applicatif : le domaine `mapProfileRow` la revérifie et rejette une ligne
incohérente (`PROFILE_ROW_INVALID`).

Le journal d’audit étant dimensionné par école (`audit_log.school_id` non
nul), les modifications de profils de plateforme ne sont pas consignées dans
le journal des écoles : la fonction `audit_business_change()` ignore ces
lignes au lieu d’échouer.

## 3. Modèle d’isolation

L’accès à la supervision repose sur trois barrières indépendantes. Une seule
barrière suffirait à interdire l’accès ; les trois limitent l’impact d’un
défaut dans l’une d’elles.

1. **Routage applicatif** — `requireArea('admin')` puis `isSuperAdmin(...)` :
   tout autre rôle est redirigé vers son propre espace
   (`src/modules/super-admin/application/guards.ts`).
2. **RLS** — les 15 politiques `*_select_super_admin` s’appliquent
   **uniquement** à `authenticated` et **uniquement** via
   `public.is_super_admin()`. Les politiques par école sont inchangées : une
   direction ne voit toujours que sa école, un parent que ses enfants liés.
3. **Helper interne** — `public.is_super_admin()` est `SECURITY DEFINER`,
   détenu par le rôle interne `school_manage_internal` (NOLOGIN, NOINHERIT,
   NOBYPASSRLS). Il ne lit que le profil de l’utilisateur du JWT et vérifie
   `is_active` : un compte désactivé perd immédiatement tous ses accès.

```sql
create policy students_select_super_admin
on public.students for select to authenticated
using (public.is_super_admin());
```

Aucune clé de service n’est utilisée : la page lit par le client serveur
authentifié, exactement comme l’espace parent.

## 4. Contenu de la page

| Bloc | Contenu |
| --- | --- |
| Indicateurs globaux | écoles supervisées, élèves, personnel, parents, notes publiées, présences, frais non soldés, écoles avec impayé, annonces publiées, notifications |
| Écoles | une carte par école : devise, élèves, personnel, parents, classes, notes publiées, annonces, notifications, frais non soldés et montant restant |
| Répartition des comptes | nombre de comptes par rôle (toutes écoles confondues) |
| Totaux financiers par devise | reste à recouvrer et encaissé, **regroupés par devise** |

Les montants ne sont jamais cumulés d’une devise à l’autre : chaque école
possède sa devise (`schools.currency_code`) et les totaux sont présentés par
devise. Une moyenne de notes suit la même règle de rigueur : pas de total
hétérogène présenté comme un total.

## 5. Lecture des données

Les lectures passent par `src/modules/super-admin/data/supervision.supabase.ts`
(client serveur authentifié) puis sont agrégées par
`src/modules/super-admin/domain/overview.ts`, module pur sans dépendance
Supabase ni React.

Chaque table est lue avec une limite de 10 000 lignes
(`SUPERVISION_ROW_LIMIT`). L’agrégat reste exact tant que la limite n’est pas
atteinte ; dès qu’une lecture l’atteint, l’agrégat est marqué comme
partiel (`truncated`) et la page affiche un avertissement, plutôt que de
présenter des totaux incomplets comme exhaustifs.

## 6. Provisionnement d’un compte de supervision

Le rôle est réservé à l’exploitation de la plateforme. Un compte est créé
par l’opérateur (console SQL ou service_role), jamais par l’application :

```sql
-- 1. compte Auth (mot de passe géré par Auth, jamais écrit en clair)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '<uuid>', 'authenticated', 'authenticated', '<adresse>', '<hash bcrypt>',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"<nom>"}'::jsonb,
  now(), now()
);

-- 2. profil transverse
insert into public.profiles (id, school_id, role, full_name, is_active)
values ('<uuid>', null, 'super_admin', '<nom>', true);
```

Les colonnes de jeton de `auth.users` doivent être non nulles (voir la
migration `20261110000001_auth_login_compatibility.sql`) : une valeur `NULL`
fait échouer la connexion de **tous** les comptes.

La désactivation est le levier d’urgence : `update public.profiles set
is_active = false where id = '<uuid>'` coupe immédiatement l’accès, sans
attendre la révocation des jetons.

## 7. Tests

| Niveau | Fichier | Couverture |
| --- | --- | --- |
| Unité | `src/modules/super-admin/domain/overview.test.ts` | agrégats par école, impayés déduits des règlements, échéances dépassées, non-cumul entre devises, profils inactifs et lignes hors école |
| Unité | `src/modules/auth/domain/roles.test.ts` | rôle `super_admin`, zone `admin`, accueil `/supervision`, refus des autres rôles |
| Unité | `src/modules/auth/domain/profile.test.ts` | profil sans école accepté pour la supervision, refusé pour les autres rôles |
| RLS (PGlite) | `supabase/tests/supervision.test.mjs` | profil transverse, lecture de toutes les écoles, visibilité des brouillons et des liens tuteurs, refus d’écriture, isolation des autres rôles, désactivation du compte |
| RLS (PGlite) | `supabase/tests/rls.test.mjs` | non-régression des politiques existantes |
| E2E (Playwright) | `tests/e2e/supervision.spec.mjs` | accès de la supervision, lecture seule, renvoi d’un parent et d’un rôle d’école, mise en page mobile |

Le serveur Supabase de test (`tests/e2e/mock-supabase.mjs`) reproduit le
comportement de la RLS selon le rôle : la supervision lit tout, un parent ne
lit que ses enfants liés, un rôle d’école ne lit que sa école.

## 8. Limites connues

- La supervision est une **vue d’ensemble** : pas de détail par élève, pas
  d’historique, pas d’export.
- Les lectures sont bornées à 10 000 lignes par table ; au-delà, la page
  affiche un avertissement explicite de **vue partielle**, pour ne pas
  présenter des totaux incomplets comme exhaustifs.
- Les agrégats sont calculés en mémoire par l’application : à grande échelle,
  une vue matérialisée ou une fonction SQL de supervision serait plus
  performante.
- Aucune écriture n’est possible depuis la supervision : toute action
  correctrice passe par le portail de l’école concernée.
- Le journal d’audit n’est pas alimenté pour les profils de plateforme, le
  journal étant dimensionné par école.
