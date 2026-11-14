# Sécurité et base de données — SCHOOL_MANAGE

> Étape 2 — schéma local et tests, sans déploiement.
>
> Les exemples et les seeds sont entièrement fictifs. Aucune instance distante ou de production n’a été modifiée.

## 1. Livrables

| Fichier | Contenu |
| --- | --- |
| `supabase/migrations/20261107000001_core_schema.sql` | Types, écoles, profils, référentiel, élèves, liens tuteurs et index |
| `supabase/migrations/20261107000002_business_events.sql` | Notes, présences, finances, annonces, notifications, audit et contraintes métier |
| `supabase/migrations/20261107000003_rls_and_audit.sql` | Rôle interne minimal, politiques RLS, privilèges et triggers d’audit |
| `supabase/migrations/20261107000004_supabase_auth_privileges.sql` | Privilèges Auth minimaux tentés sur Supabase, conservés pour la traçabilité |
| `supabase/migrations/20261107000005_jwt_without_auth_schema.sql` | Lecture directe des claims JWT dans les fonctions internes, sans privilège sur le schéma `auth` |
| `supabase/seed.sql` | Deux écoles fictives, comptes Auth sans mot de passe utilisable et données de démonstration |
| `supabase/tests/helpers.mjs` | Harnais PostgreSQL local et simulation minimale de `auth.users`/`auth.uid()` |
| `supabase/tests/rls.test.mjs` | 32 tests d’isolation, de droits et de règles métier |
| `package.json` / `package-lock.json` | Commande de test et unique dépendance de développement PGlite |

Aucune application Next.js, interface, Edge Function, notification push ou fonctionnalité des étapes 3 à 9 n’est incluse.

## 2. Modèle multi-tenant

### 2.1 Règles structurelles

- `schools.id` est la racine du tenant.
- Toutes les autres tables métier portent un `school_id NOT NULL`.
- Un profil correspond à un `auth.users.id` et appartient à une seule école en V1.
- Les relations sensibles utilisent des clés étrangères composites `(school_id, entity_id)`. Un élève de l’école B ne peut donc pas être rattaché à une note ou un paiement de l’école A, même avec des privilèges d’administration applicative.
- `school_id` est immutable sur les tables qui le contiennent.
- Les UUID sont générés par Postgres ; les seeds utilisent des UUID fixes uniquement pour rendre les tests lisibles.
- Les montants sont des entiers `bigint` dans la plus petite unité monétaire. Aucune colonne monétaire flottante n’est utilisée.
- Les horodatages sont des `timestamptz`. Les présences utilisent une `date` scolaire.

### 2.2 Limites volontaires du modèle V1

- Un parent multi-écoles n’est pas pris en charge : il faudrait faire évoluer le modèle d’appartenance avant d’ouvrir ce cas.
- `students.class_id` représente la classe courante. Il n’y a pas de table d’historique des inscriptions.
- `attendance.class_id` conserve la classe au moment de la présence. Une correction de statut reste possible après un changement de classe courante.
- Il n’existe pas de table d’affectation enseignant–classe. Les enseignants et surveillants ont donc une étendue **école entière**, limitée par leur rôle, et non une étendue par classe.
- Les comptes et profils ne sont pas administrables via l’API applicative à cette étape : aucune politique INSERT/UPDATE/DELETE n’est accordée sur `profiles`.

## 3. Identité et autorisation

### 3.1 Source de vérité

- L’identifiant de l’acteur provient de `auth.uid()`.
- Le rôle, le tenant et l’état actif sont lus dans `public.profiles`, pas dans une valeur envoyée par le navigateur.
- Le rôle n’est pas accepté depuis `raw_user_meta_data` et aucune politique ne fait confiance à un `school_id` de requête.
- Un profil inactif perd tous les accès métier, y compris si d’anciens liens tuteurs sont encore marqués actifs. Son propre profil reste lisible pour afficher l’état du compte.

### 3.2 Rôles

| Valeur | Acteur |
| --- | --- |
| `parent` | Parent ou tuteur lié à un ou plusieurs élèves |
| `direction` | Direction de l’école |
| `secretary` | Secrétariat |
| `accountant` | Comptable |
| `teacher` | Enseignant |
| `supervisor` | Surveillant |
| `super_admin` | Supervision globale de la plateforme, transverse : sans école |

Le rôle `super_admin` n’appartient à aucune école : la contrainte
`profiles_school_matches_super_admin` impose la biconditionnalité
`(role = 'super_admin') = (school_id is null)`, donc un `super_admin` ne peut
pas être rattaché à une école et un profil sans école ne peut être qu’un
`super_admin`. Il dispose de politiques de **lecture seule**
sur les 15 tables : aucune politique `INSERT`, `UPDATE` ou `DELETE` ne le
concerne, et le détail figure dans `docs/SUPERVISION.md`.

Les privilèges SQL et la RLS sont cumulatifs : une politique seule ne suffit pas si le privilège de table/colonne est absent, et un privilège seul ne donne aucune ligne sans politique.

## 4. Matrice RLS effective

Dans les tableaux, « parent lié » signifie toujours : profil `parent` actif, `recipient/guardian_id = auth.uid()` selon le cas, et `guardian_links.is_active = true` pour l’élève concerné.

### 4.1 Tenant et référentiel

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `schools` | Membre actif de l’école | Refusé | Direction de l’école | Refusé |
| `profiles` | Son profil ; direction/secrétariat/comptable de l’école | Refusé | Refusé | Refusé |
| `classes` | Membres actifs de l’école | Direction, secrétariat | Direction, secrétariat | Refusé |
| `subjects` | Membres actifs de l’école | Direction, secrétariat | Direction, secrétariat | Refusé |
| `periods` | Membres actifs de l’école | Direction, secrétariat | Direction, secrétariat | Refusé |

Les parents peuvent lire les noms du référentiel de leur école, mais pas les élèves de ces classes.

### 4.2 Élèves et tuteurs

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `students` | Personnel de l’école ; parent lié à l’élève | Direction, secrétariat | Direction, secrétariat | Refusé |
| `guardian_links` | Parent actif pour ses propres liens ; direction/secrétariat/comptable | Direction, secrétariat | Direction, secrétariat | Refusé |

Contraintes complémentaires :

- le tuteur doit être un profil `parent` actif de la même école ;
- un couple tuteur–élève est unique par école ;
- tuteur et élève d’un lien sont immuables ;
- la désactivation d’un lien renseigne automatiquement `ended_on` ; sa réactivation l’efface ;
- la révocation retire immédiatement l’accès aux données et notifications de l’élève ;
- le parent peut encore voir son propre historique de lien révoqué, mais plus les données de l’élève.

### 4.3 Notes et présences

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `grades` | Direction/enseignant de l’école ; parent lié pour une note publiée | Direction, enseignant | Direction, enseignant | Refusé |
| `attendance` | Direction/secrétariat/enseignant/surveillant ; parent lié | Mêmes rôles de personnel | Mêmes rôles de personnel | Refusé |

Règles métier :

- `graded_by` et `recorded_by` doivent être l’acteur à l’insertion et restent immuables ; les corrections sont attribuées à leur auteur via `audit_log`.
- Une note publiée reçoit `published_at` automatiquement. Un brouillon n’est jamais visible par un parent.
- Élève, matière et période d’une note sont immuables ; score, libellé et statut restent corrigeables.
- Élève, classe et date d’une présence sont immuables ; statut et commentaire restent corrigeables.
- À la création, la classe de présence doit être la classe courante de l’élève.
- L’unicité évite les doublons note/évaluation et élève/jour de présence.

### 4.4 Finances

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `fees` | Direction/comptable ; parent lié | Direction, comptable | Direction, comptable | Refusé |
| `payments` | Direction/comptable ; parent lié | Direction, comptable | Refusé | Refusé |

Règles métier :

- `created_by` d’un frais et `received_by` d’un paiement sont contrôlés ;
- l’élève d’un frais est immutable ;
- le paiement doit correspondre au même frais, au même élève et à la même école ;
- un verrou `FOR UPDATE` sur le frais sérialise les paiements concurrents et le total ne peut pas dépasser son montant ;
- un frais ne peut pas être réduit sous le total déjà encaissé ;
- le numéro de reçu est unique par école ;
- les moyens de paiement sont uniquement manuels : espèces, virement, chèque ou autre. Aucun Mobile Money n’est implémenté ;
- un paiement est append-only pour l’application. Aucun avoir ou mécanisme d’annulation n’est encore prévu.

### 4.5 Annonces et notifications

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `announcements` | Direction/secrétariat ; parent lié destinataire d’une notification pour l’annonce publiée | Direction, secrétariat, en brouillon | Direction, secrétariat, avant publication | Refusé |
| `announcement_targets` | Direction, secrétariat | Direction, secrétariat, sur brouillon | Direction, secrétariat, sur brouillon | Direction, secrétariat, sur brouillon |
| `notifications` | Parent destinataire et lié ; direction de l’école | Refusé pour les utilisateurs | Parent destinataire, colonne `read_at` uniquement | Refusé |

Les quatre cibles sont exactement `whole_school`, `class`, `overdue` et `student`. La forme de la ligne est vérifiée : une cible classe exige `class_id`, une cible élève exige `student_id`, les autres champs de cible doivent être nuls.

Le cycle est : brouillon → une ou plusieurs cibles → publication. Une annonce sans cible ne peut pas être publiée. Annonce et cibles deviennent immuables après publication.

**Limite de périmètre :** la création automatique des notifications lors des événements et la résolution dynamique des impayés ne sont pas encore implémentées. Elles appartiennent aux étapes 6/7. Les notifications du seed sont des données fictives permettant déjà de tester la RLS. Une annonce nouvellement publiée sans notification matérialisée n’est donc pas encore visible par un parent.

### 4.6 Audit

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `audit_log` | Direction de l’école | Trigger via le rôle interne uniquement | Refusé | Refusé |

Chaque INSERT, DELETE et UPDATE **avec changement réel** des 14 autres tables écrit une ligne contenant :

- école, acteur `auth.uid()` et date ;
- action, table et UUID de l’entité ;
- noms des colonnes modifiées, sans anciennes/nouvelles valeurs ;
- `transaction_id = txid_current()` pour regrouper les écritures d’une même transaction.

Les opérations du seed ont un `actor_id` nul. Le journal ne conserve ni contenu d’annonce, ni nom d’élève, ni montant dans les valeurs historisées : cela limite les données sensibles, mais ne permet pas de reconstituer une ancienne valeur.

`set_updated_at` laisse la ligne inchangée lors d’un UPDATE sans modification réelle. Le trigger d’audit compare alors `NEW` et `OLD` et sort avant toute conversion JSONB : ni `updated_at`, ni ligne d’audit ne sont ajoutés.

## 5. Fonctions internes et absence de contournement applicatif

Quatre fonctions utilisent `SECURITY DEFINER` pour éviter une récursion de politique sur `profiles` ou écrire l’audit :

- `is_school_member(uuid)` ;
- `has_school_role(uuid, app_role[])` ;
- `is_super_admin()` ;
- `audit_business_change()`.

`is_super_admin()` ne lit que le profil de l’utilisateur du JWT et exige le
rôle `super_admin` **actif** : c’est la seule porte d’entrée des 15
politiques `*_select_super_admin`. Comme les autres helpers, il relit les
claims publics de la requête (`request.jwt.claim.sub`) au lieu de dépendre du
schéma `auth`, dont les privilèges ne sont pas garantis par Supabase
hébergé.

Leur propriétaire est le rôle dédié `school_manage_internal` avec :

- `NOLOGIN` et `NOINHERIT` ;
- `NOBYPASSRLS` explicitement vérifié par test ;
- `SET row_security = on` et `SET search_path = ''` ;
- `USAGE` limité aux schémas nécessaires ;
- SELECT sur `profiles` et INSERT sur `audit_log`, chacun soumis à une politique dédiée ;
- aucun privilège sur les autres tables métier.

La politique interne `profiles_internal_read` est limitée à `id = (select auth.uid())` : le rôle technique ne peut donc lire que le profil de l’utilisateur courant, pas tous les profils. Elle ne s’applique ni à `authenticated`, ni à `anon`. La RLS est activée **et forcée** sur les 15 tables ; elle n’est jamais désactivée dans les migrations. `SET row_security = on` ne remplace pas ce FORCE RLS déjà créé sur les tables : il maintient aussi RLS active pendant l’exécution des fonctions internes.

Les migrations et le seed local sont nécessairement exécutés par le rôle d’administration de la base jetable. Cette administration d’installation n’est pas un parcours applicatif. Aucun `service_role`, secret, rôle `BYPASSRLS` ou client privilégié n’est fourni à l’application.

## 6. Privilèges et exposition PostgREST

- `anon` n’a aucun privilège sur les tables métier.
- `authenticated` reçoit uniquement les SELECT/INSERT/UPDATE/DELETE nécessaires à la matrice.
- Les parents n’ont aucun privilège d’écriture métier.
- Les UPDATE sont accordés **par colonne**, et non sur la ligne entière. Les triggers peuvent toujours maintenir les champs techniques sans donner leur écriture directe à l’API.
- `notifications` accorde seulement `UPDATE(read_at)`, pas un UPDATE complet.
- `audit_log` accorde seulement SELECT à `authenticated`, puis RLS le limite à la direction.
- Les suppressions applicatives sont refusées partout sauf pour une cible d’annonce encore en brouillon.
- Les fonctions de résolution de rôle ne sont exécutables que par `authenticated` et leur rôle propriétaire ; elles ne sont pas exposées à `anon`.

| Table | Colonnes modifiables directement par les rôles autorisés |
| --- | --- |
| `schools` | `name`, `slug`, `timezone`, `locale`, `currency_code` |
| `classes` | `school_year`, `name`, `level` |
| `subjects` | `code`, `name` |
| `periods` | `school_year`, `name`, `starts_on`, `ends_on` |
| `students` | `class_id`, `student_code`, `first_name`, `last_name` |
| `guardian_links` | `relationship_label`, `is_active`, `starts_on`, `ended_on` |
| `grades` | `evaluation_label`, `score`, `max_score`, `status` |
| `attendance` | `status`, `comment` |
| `fees` | `label`, `amount_minor`, `due_on` |
| `announcements` | `title`, `body`, `status` |
| `announcement_targets` | `target_type`, `class_id`, `student_id` |
| `notifications` | `read_at` |

`school_id`, les UUID, les auteurs, les dates techniques et les champs de publication sont donc protégés cumulativement par privilèges de colonnes, triggers et RLS.

Une tentative UPDATE/DELETE peut selon le cas retourner une erreur de privilège/RLS ou `0 ligne affectée` lorsque la ligne est filtrée. Les tests vérifient les deux formes de refus et l’absence de modification.

### 6.1 Optimisations RLS et audit

- Les comparaisons directes utilisent `(select auth.uid())` afin de permettre à Postgres de mettre en cache l’appel stable par requête. Les appels `has_school_role(school_id, ...)` dépendent de chaque ligne et ne sont pas présentés comme pouvant être mis en cache globalement.
- `guardian_links_student_active_idx (school_id, student_id, guardian_id) WHERE is_active` couvre les recherches d’accès par élève.
- `guardian_links_guardian_active_idx (guardian_id, school_id, student_id) WHERE is_active` couvre le parcours inverse par tuteur.
- Les UPDATE sans changement réel sortent avant les conversions JSONB de l’audit. Le coût JSONB subsiste sur les vraies modifications et reste à mesurer sous charge.
- La troisième migration contient 41 politiques et 14 triggers d’audit, sans nom dupliqué. Elle est prévue pour une exécution unique, comme les autres migrations, et non comme un script idempotent à rejouer.

Ces optimisations structurelles ne remplacent pas les tests `EXPLAIN` et de charge sur Supabase réel.

## 7. Données fictives

Le seed contient :

- écoles **École entièrement fictive A** et **École entièrement fictive B** ;
- trois élèves fictifs A et un élève fictif B, nommés `Enfant-Démo-*` ;
- `parent.a1@example.invalid` avec deux enfants ;
- `parent.a2@example.invalid`, second tuteur de l’élève A2 ;
- `parent.a3@example.invalid`, tuteur de l’élève A3 ;
- `parent.a0@example.invalid`, sans lien ;
- direction, secrétariat, comptable, enseignant et surveillant fictifs ;
- notes publiées et brouillon, présences, frais soldés/impayés, paiements, quatre types d’annonces et notifications.

Le domaine `.invalid` est réservé et ne correspond à aucune adresse réelle.

Les lignes `auth.users` du seed ont un mot de passe vide et ne sont **pas des comptes de connexion utilisables**. Elles satisfont les clés étrangères locales. L’étape 3 devra compléter/provisionner les comptes via Supabase Auth plutôt que de documenter un faux identifiant de connexion.

Le seed est prévu pour une base locale vide, après les migrations. Il ne contient aucun `TRUNCATE`, `DROP` ou suppression, mais il n’est pas conçu comme un script idempotent à rejouer sur des données existantes.

## 8. Tests exécutés

### 8.1 Environnement

Aucun binaire Supabase, PostgreSQL ou Docker n’était disponible. Les tests utilisent donc :

- Node.js 22 et le runner `node:test` ;
- `@electric-sql/pglite` **0.5.15**, PostgreSQL réel compilé en WASM ;
- un bootstrap minimal pour `auth.users` et `auth.uid()`, seuls éléments Supabase simulés ;
- les cinq migrations et `seed.sql` exécutés sans réécriture.

PGlite occupe environ 26,3 MB décompressés : c’est une dépendance lourde, mais **exclusivement de développement**, absente du bundle et justifiée par la nécessité d’exécuter réellement RLS, triggers et contraintes sans Docker. Elle n’est pas une dépendance de la future PWA.

Commande :

```bash
npm install
npm run test:db
```

Dernier résultat obtenu : **40 tests réussis, 0 échec** (32 historiques + 8 ajoutés à l’étape 5 pour l’espace parent : isolation multi-enfants, absence de brouillon, filtrage des annonces et notifications, refus d’écriture et de suppression, révocation d’un lien).

### 8.2 Ce que les tests prouvent dans cet environnement

- ENABLE RLS et FORCE RLS sur les 15 tables ;
- impossibilité de connexion et `NOBYPASSRLS` du rôle interne ;
- absence d’accès anonyme ;
- parent à deux enfants, second tuteur et parent sans lien ;
- refus de lecture des enfants d’un autre parent pour toutes les données métier ;
- invisibilité d’un brouillon de note et d’une annonce ciblée à un autre élève ;
- refus des écritures parent et de l’élévation de rôle ;
- isolation de toutes les données entre deux écoles ;
- refus des écritures inter-écoles et des relations composites incohérentes ;
- immutabilité de `school_id` et des identités d’événements ;
- séparation comptable/enseignant/surveillant ;
- révocation/restauration d’un lien et désactivation du profil parent ;
- cohérence de classe d’une présence et conservation du cliché historique ;
- mise à jour de `read_at` limitée au destinataire ;
- reçu et audit d’un paiement, refus du surpaiement et du mauvais élève ;
- audit des créations/corrections et journal append-only ;
- publication d’annonce avec cible obligatoire puis immutabilité ;
- limitation du rôle interne au seul profil courant ;
- refus direct des UPDATE sur les colonnes techniques et d’identité ;
- absence d’audit et de changement `updated_at` pour un UPDATE sans modification réelle.

### 8.3 Supervision globale (étape 6)

La suite `supabase/tests/supervision.test.mjs` (7 tests) vérifie au niveau de
la base :

- le profil de supervision globale n’appartient à aucune école, et la
  contrainte interdit l’absence d’école pour tout autre rôle ;
- la supervision lit les deux écoles, tous les élèves, toutes les notes
  (brouillons compris), les liens tuteurs, les frais, les paiements, les
  annonces et les notifications ;
- elle ne peut rien écrire : insertions refusées, mise à jour sans effet,
  suppression refusée ;
- l’isolation des autres rôles est inchangée : une direction ne voit que sa
  école, un parent que ses enfants liés ;
- `is_super_admin()` ne répond `true` que pour le rôle de supervision actif ;
- la désactivation du profil coupe immédiatement tous les accès.

### 8.4 Tests E2E et doublure Supabase locale (étape 5)

Les parcours de l’espace parent sont vérifiés par Playwright
(`tests/e2e/parent-space.spec.mjs`). Pour ne dépendre d’aucun accès réseau
vers le projet hébergé, ils s’exécutent contre `tests/e2e/mock-supabase.mjs` :

- le serveur nListening que sur `127.0.0.1` et ne contient **aucun secret** ;
- la clé publique utilisée est une chaîne de test sans rapport avec le projet ;
- les jetons signés sont des JWT factices signés `signature-locale`, jamais des
  jetons Supabase ;
- toutes les données sont fictives et locales au dépôt ;
- le serveur ne remplace pas la base réelle : les tests RLS de la section 8.1
  continuent de s’exécuter sur les migrations et le seed réels.

La doublure n’est jamais déployée : elle vit dans `tests/e2e/` et n’est ni
importée par l’application, ni embarquée dans le bundle.

### 8.5 Ce qui n’a pas été testé

- Supabase CLI, une connexion GoTrue réelle et les requêtes PostgREST de l’application ;
- les comptes du seed avec Supabase Auth réel ;
- la concurrence avec plusieurs connexions PostgreSQL simultanées, malgré le verrou prévu ;
- les performances de politiques et index sous forte charge ;
- Realtime, Web Push, caches PWA et sécurité des futures Server Actions ;
- un test de charge sur la diffusion à toute une école.

Ces points ne doivent pas être présentés comme validés. La validation SQL hébergée ci-dessous ne remplace ni un parcours Auth réel ni les tests de l’API.

### 8.6 Validation sur Supabase hébergé — 7 novembre 2026

Avec l’autorisation explicite de l’utilisateur, le projet unique **LIAKOLO** (`xaxwfrofmrawqojewigq`, eu-west-1) a été inspecté puis complété via le connecteur Supabase :

- les migrations 1 et 2 ainsi que les 13 utilisateurs fictifs du seed étaient déjà présents ; ils n’ont pas été rejoués ni modifiés ;
- la migration 3 a été appliquée après deux échecs entièrement annulés, liés aux transferts de propriété sur une plateforme non superutilisateur ;
- les migrations 4 et 5 documentent et corrigent la particularité Supabase des privilèges sur le schéma `auth` ;
- la version distante finale contient **15 tables RLS + FORCE RLS, 41 politiques et 14 triggers d’audit** ;
- le rôle interne reste `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS`, sans `CREATE` sur `public` ni `USAGE` sur `auth` ;
- Supabase conserve une ligne d’administration `supabase_admin` entre `postgres` et le rôle interne, mais `SET`, `INHERIT` et `USAGE` du rôle sont tous refusés ;
- les trois fonctions internes appartiennent à `school_manage_internal`, avec `row_security=on`, et lisent les mêmes claims JWT que la définition publique de `auth.uid()` sans accéder au schéma `auth` ;
- aucun accès anonyme aux tables n’est présent.

Un bloc SQL en lecture seule, exécuté sous le rôle `authenticated` avec des claims JWT fictifs, a vérifié sur la base hébergée : deux enfants visibles pour le parent lié, aucun enfant pour le parent sans lien, aucune fuite inter-écoles et aucun brouillon de note visible.

Aucun mot de passe n’a été créé ou modifié. La connexion Auth réelle et PostgREST restent donc à tester séparément.

### 8.7 Normalisation des colonnes de jeton — 7 novembre 2026

Une connexion en ligne échouait en `HTTP 500 unexpected_failure` (« Database error querying schema ») pour **tout** couple identifiants/mot de passe, y compris des identifiants manifestement inexistants.

Cause racine établie par lecture du code de GoTrue v2.197.0 (`internal/api/token.go`, `internal/models/user.go`), et non par une hypothèse : le modèle `models.User` déclare `confirmation_token`, `recovery_token`, `email_change_token_current`, `email_change_token_new`, `email_change`, `phone_change_token` et `reauthentication_token` comme des chaînes Go **non nullables**. Les 14 lignes `auth.users`, provisioned par insertion SQL, laissaient `email_change` (et les colonnes de jeton) à `NULL` ; le scan SQL échouait et l’erreur remontait jusqu’à `models.FindUserByEmailAndAudience`, qui renvoie alors un 500 au lieu d’un « identifiants invalides ».

Action appliquée sur la base hébergée, avec l’accord explicite de l’utilisateur :

```sql
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '');
```

Périmètre réel : **14 lignes**, **7 colonnes de jeton**, aucune autre colonne touchée. Aucun e-mail, mot de passe, profil, rôle, école, lien parent–élève, donnée métier, politique RLS ou trigger n’a été modifié, ajouté ou supprimé. Le schéma `auth` reste inchangé : aucun objet n’y a été créé.

Piste écartée : la table `auth.factors`. GoTrue v2.197.0 mappe `Factor.TableName()` sur `mfa_factors`, et le ledger `auth.schema_migrations` de la base correspond exactement à cette version (`20260831180000`). Aucune vue de compatibilité n’est donc nécessaire, et le ticket support suggéré par le rapport amont n’a pas été envoyé.

Vérification après correctif : `POST /auth/v1/token?grant_type=password` répond `HTTP 200` et délivre un jeton pour le compte de démonstration. La fonction Edge de diagnostic temporaire utilisée pour cette vérification a été supprimée dans la foulée. Le compte de démonstration lui-même a ensuite été supprimé du projet hébergé, avec son profil et ses liens tuteurs : aucun compte à mot de passe connu ne subsiste en production.

La reproduction est assurée par `supabase/migrations/20261110000001_auth_login_compatibility.sql` et par le bloc correspondant de `supabase/seed.sql` (voir `docs/AUTHENTIFICATION.md`, section 3 bis).

## 9. Procédure avant tout environnement distant

1. Obtenir une validation explicite de l’environnement cible et de la revue SQL.
2. Exécuter d’abord les migrations sur un projet Supabase local/jetable avec la CLI.
3. Rejouer les mêmes tests contre cette instance ou exécuter une suite pgTAP équivalente.
4. Vérifier que le rôle interne peut être créé sans privilège excessif et que les fonctions conservent `NOBYPASSRLS`.
5. Vérifier le seed uniquement sur des données fictives ; ne pas le lancer sur une base contenant des données réelles.
6. Sauvegarder et rédiger un plan de retour arrière avant toute migration validée.
7. Ne jamais lancer le seed ou une migration sur la production depuis la CI de test.

Aucune de ces actions distantes n’a été effectuée à l’étape 2. L’exécution hébergée autorisée ultérieurement est consignée en 8.5 ; elle ne dispense pas des sauvegardes et validations prévues pour les prochaines migrations.

## 10. Risques restants

| Niveau | Risque / limite | Traitement attendu |
| --- | --- | --- |
| Moyen | SQL hébergé et RLS en lecture validés, mais Supabase CLI, GoTrue et PostgREST non testés | Provisionner un compte fictif autorisé et tester le parcours applicatif réel |
| Moyen | Enseignants/surveillants étendus à toute l’école faute d’affectations | Valider cette étendue ou demander une évolution du schéma avant le portail |
| Moyen | Notifications automatiques et résolution des impayés absentes à ce stade | Implémenter aux étapes 6/7 sans prétendre qu’elles fonctionnent déjà |
| Moyen | Aucun avoir/annulation de paiement ; une erreur d’encaissement ne se corrige pas dans l’application | Définir un flux contrôlé avant usage réel, sans UPDATE silencieux des reçus |
| Moyen | Audit sans anciennes/nouvelles valeurs | Compléter sélectivement si le besoin de preuve le justifie, après analyse de confidentialité |
| Moyen | Verrou de surpaiement non éprouvé en concurrence réelle | Test multi-connexions avant production |
| Moyen | Parent multi-écoles et historique d’inscription non couverts | Évolution explicite du périmètre et du schéma si nécessaire |
| Faible | `notifications.source_id` est polymorphe et n’a pas de FK générique | Valider la source dans les futures fonctions d’événement |
| Faible | Performance RLS et diffusion de masse non mesurée | `EXPLAIN`, volumes fictifs représentatifs et traitement par lots |
| Faible | Comptes Auth du seed sans connexion | Provisionnement Auth à l’étape 3 |
