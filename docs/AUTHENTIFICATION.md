# Authentification et rôles — étape 3

> Périmètre : email/mot de passe, session Supabase, redirection par rôle, layouts et sélecteur d’enfant.
> Aucune note, présence, donnée financière, annonce ou autre contenu métier n’est affiché.

## 1. Parcours implémenté

1. `/connexion` affiche le formulaire email/mot de passe.
2. Le navigateur appelle `supabase.auth.signInWithPassword` avec la clé **publique** uniquement.
3. Après succès, `/compte` lit l’utilisateur avec `supabase.auth.getUser()` côté serveur, puis son profil Postgres via RLS.
4. Le rôle du profil détermine l’espace de destination.
5. Chaque layout protégé revérifie le profil actif et la zone autorisée.
6. La déconnexion appelle `supabase.auth.signOut()`, puis revient à `/connexion`.

| Rôle | Zone | Destination |
| --- | --- | --- |
| `parent` | Parent | `/parent` |
| `direction` | École | `/ecole` |
| `secretary` | École | `/ecole` |
| `accountant` | École | `/ecole` |
| `teacher` | Enseignant | `/enseignant` |
| `supervisor` | Enseignant | `/enseignant` |

Un rôle qui tente une autre zone est redirigé vers son propre espace. Un visiteur sans session va à `/connexion` ; un profil inactif va à `/compte-desactive`.

## 2. Sélecteur d’enfant

- Les enfants sont lus via `guardian_links` avec `guardian_id = profiles.id` et `is_active = true`.
- La requête utilise les tables `students` et `classes` en jointure interne, sous RLS.
- Aucun enfant : état vide avec consigne de contacter le secrétariat.
- Un enfant : redirection vers `/parent/[studentId]`.
- Plusieurs enfants : liste de choix, puis sélecteur natif dans le layout enfant.
- Un `studentId` absent des liens actifs produit `notFound()` : l’application ne révèle pas si l’identifiant appartient à un autre parent.
- Le sélecteur utilise une navigation Next.js et une cible native accessible au clavier et au tactile.

Les lectures du profil et des enfants utilisent `React.cache`, limité à la requête serveur courante. Aucun profil ou enfant n’est partagé entre utilisateurs.

## 3. Structure principale

| Fichier | Responsabilité |
| --- | --- |
| `src/proxy.ts` | Rafraîchissement de session et propagation des cookies |
| `src/shared/supabase/client.ts` | Client navigateur avec configuration publique |
| `src/shared/supabase/server.ts` | Client serveur avec JWT utilisateur et cookies Next.js |
| `src/shared/config/env.ts` | Validation URL/clé publique et refus des clés secrètes |
| `src/modules/auth/data/current-profile.ts` | Utilisateur Auth + profil Postgres sous RLS |
| `src/modules/auth/application/guards.ts` | Gardes de session, compte actif et zone |
| `src/modules/auth/domain/` | Rôles, redirections et validation du profil, indépendants de Next.js |
| `src/modules/parent/data/children.supabase.ts` | Accès aux enfants liés |
| `src/modules/parent/domain/children.ts` | Règles pures du sélecteur |
| `src/app/(authenticated)/` | Layouts parent, école et enseignant |
| `src/messages/fr.json` | Libellés français centralisés |

Les routes authentifiées et `/connexion` sont en `force-dynamic` afin qu’un build sans variables Supabase ne fige pas l’état de session.

## 3 bis. Échec de connexion : cause racine et correctif

Un `HTTP 500` « Database error querying schema » sur **toute** tentative de connexion (mêmes identifiants invalides ou non) provient du scan de la ligne `auth.users` par GoTrue.

Le modèle `models.User` de GoTrue déclare plusieurs colonnes comme des chaînes Go simples, donc **non nullables** :

```text
confirmation_token, recovery_token, email_change_token_current,
email_change_token_new, email_change, phone_change_token, reauthentication_token
```

Un compte créé par insertion SQL directe (seed, provisionnement de démonstration) laisse ces colonnes à `NULL`. Le scan échoue alors sur `converting NULL to string is unsupported` ; l’erreur remonte jusqu’à `models.FindUserByEmailAndAudience` et l’API Auth répond `500 unexpected_failure` — message volontairement indistinct, qui masque la panne serveur derrière une impression de « mauvais identifiants ».

Correctif appliqué :

- `supabase/migrations/20261110000001_auth_login_compatibility.sql` normalise ces sept colonnes en chaîne vide (valeur identique à celle que GoTrue écrit pour un compte créé par lui). Aucun e-mail, mot de passe, profil, rôle, école ou lien n’est modifié.
- `supabase/seed.sql` applique la même normalisation après le seed, pour que le jeu local soit reproductible.
- Le bloc est conditionnel : il est ignoré si les colonnes n’existent pas (base de test PGlite).

> Piste écartée : la table `auth.factors`. GoTrue v2.197.0 mappe bien `Factor.TableName()` sur `mfa_factors`, et le ledger `auth.schema_migrations` de la base correspond exactement à cette version (`20260831180000`). Aucune vue de compatibilité n’est donc créée, et le schéma `auth` reste intact.

Après application, `POST /auth/v1/token?grant_type=password` répond `HTTP 200` avec un jeton pour le compte de démonstration.

## 3 ter. Messages d’erreur de connexion

Le formulaire ne masque plus une panne serveur derrière un message « réseau ». `src/modules/auth/domain/login-error.ts` classifie l’échec, et le message est adapté au cas :

| Cas | Message |
| --- | --- |
| Identifiants invalides | « E-mail ou mot de passe incorrect. » |
| E-mail non confirmé | « Votre adresse e-mail n’est pas encore confirmée… » |
| Quota dépassé | « Trop de tentatives de connexion… » |
| Panne du service d’authentification (5xx) | « Le service de connexion est momentanément indisponible… » |
| Réseau indisponible | « Impossible de joindre le service de connexion… » |
| Autre | « La connexion a échoué. Réessayez… » |

Le cas « identifiants invalides » ne révèle toujours pas si le compte existe. Les autres messages n’exposent aucune donnée personnelle. Une « Référence technique » non sensible (code HTTP, code d’erreur) accompagne le message d’erreur serveur pour le support.

## 4. Configuration locale

Aucune valeur réelle n’est commitée. `.env.example` contient uniquement les noms et exemples non exploitables.

```bash
cp .env.example .env.local
```

Puis renseigner localement :

- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet ;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé **anon/publishable publique uniquement**.

La configuration refuse :

- une URL sans protocole HTTP(S) ;
- une clé commençant par `sb_secret_` ;
- un JWT dont le payload contient `role = service_role`.

Ne jamais utiliser `SUPABASE_SERVICE_ROLE_KEY`, un mot de passe Postgres ou une clé secrète dans l’application, le navigateur, le service worker ou Git.

Commandes :

```bash
npm install
npm run dev
```

La prévisualisation sans variables affiche volontairement « Configuration Supabase requise » et désactive le formulaire plutôt que de simuler une connexion.

## 5. Comptes de démonstration et téléphone

Les lignes `auth.users` du seed de l’étape 2 ont un mot de passe vide et ne permettent pas de se connecter. Elles servent uniquement aux contraintes SQL. Pour tester le formulaire réel, il faut provisionner les comptes via Supabase Auth dans un environnement local autorisé et conserver la correspondance `auth.users.id = profiles.id`.

Le compte de démonstration utilisé pour la validation en ligne est provisionné par Supabase Auth (mot de passe connu, e-mail en domaine `.invalid`, profil `parent` actif, deux enfants liés) : il est créé par un script de provisionnement, jamais par le seed.

**Téléphone non implémenté à cette étape :** Supabase prend en charge l’OTP téléphone, mais aucun fournisseur SMS ni configuration Auth réelle n’est accessible. Ajouter ce parcours sans le tester créerait une fonctionnalité non fiable et pourrait engendrer des coûts. Il ne sera envisagé qu’après accès à une configuration de test explicite.

Après autorisation explicite, les migrations distantes 3 à 5 ont été appliquées sur le projet LIAKOLO et la RLS a été vérifiée en lecture avec des claims JWT fictifs. Les migrations 1 et 2 ainsi que le seed étaient déjà présents et n’ont pas été rejoués. Voir `docs/SECURITE.md`, section 8.4. Aucun mot de passe n’a été modifié.

## 6. Sécurité

- Aucun rôle n’est accepté depuis un formulaire, un paramètre d’URL ou `raw_user_meta_data`.
- `auth.getUser()` valide l’utilisateur auprès de Supabase ; le profil est ensuite lu via RLS.
- Le proxy ne remplace pas les gardes : chaque layout protégé revérifie l’accès.
- Les pages protégées ne contiennent pas de données métier dans leurs réponses sans session ; Next.js renvoie une redirection `/connexion` (sous forme de redirection streamée/meta refresh dans le test de production Next 16).
- Les erreurs d’authentification distinguent le cas « identifiants invalides » (sans révéler l’existence d’un compte) des pannes de service et des erreurs réseau ; seule une référence technique non sensible est affichée.
- Les logs client ne contiennent ni mot de passe, ni session, ni profil.
- Les cookies sont gérés par `@supabase/ssr`, sans token écrit dans le code ou un stockage applicatif maison.
- Seuls Lucide React, Next.js et les clients Supabase nécessaires ont été ajoutés au runtime ; Motion, GSAP et toute autre bibliothèque d’animation restent absents.
- `minimatch` est épinglé à `11.0.5` uniquement dans la dépendance de développement `@typescript-eslint/typescript-estree`, pour corriger GHSA-g3hv-75wg-m249 sans modifier les versions 3.x utilisées par les plugins ESLint.

## 7. Vérifications exécutées

- **48 tests unitaires Vitest** : rôles, gardes, profils, sélecteur, configuration et classification des erreurs de connexion.
- **32 tests SQL/RLS** de l’étape 2 conservés.
- **26 tests E2E Playwright** : manifeste et service worker (6), matrice responsive 320 → 1440 px (20).
- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm run build` : réussi avec Next.js 16.4.5 ; routes protégées dynamiques.
- `npm audit --audit-level=moderate` : **0 vulnérabilité** après correction de la dépendance de lint.
- Prévisualisation de production sans configuration :
  - `/`, `/connexion`, `/compte-desactive` répondent 200 ;
  - `/compte`, `/parent`, `/ecole`, `/enseignant`, `/parent/[studentId]` contiennent une redirection `/connexion` et aucun contenu métier.
- Connexion réelle validée côté service d’authentification : `POST /auth/v1/token?grant_type=password` répond `HTTP 200` et délivre un jeton pour le compte de démonstration, après application de la normalisation des colonnes de jeton.

## 8. Non testé et limites

- Parcours complet dans un navigateur réel : la validation ci-dessus porte sur la réponse de l’API Auth, pas sur la navigation du navigateur de l’utilisateur (l’environnement de test ne peut pas joindre `supabase.co`).
- Redirections avec une session réelle pour chacun des six rôles : seul le rôle `parent` dispose d’un compte provisionné.
- Sélecteur avec de vraies données Supabase et changement de compte sur appareil partagé.
- Parcours OTP téléphone/SMS.
- Audit clavier complet et lecteur d’écran.
- Expiration du JWT et renouvellement de session en conditions réelles.

Ces limites empêchent de considérer l’authentification comme validée de bout en bout pour les six rôles.
