# Authentification et rôles — étape 3

> Périmètre : email/mot de passe, session Supabase, redirection par rôle, layouts et sélecteur d’enfant.
> Aucune note, présence, donnée financière, annonce ou autre contenu métier n’est affiché.
>
> La protection anti-spam et la validation du formulaire ajoutées lors de la
> mise en conformité avant mise en ligne sont décrites dans
> **[MISE-EN-LIGNE.md](MISE-EN-LIGNE.md)**.

## 1. Parcours implémenté

1. `/connexion` affiche le formulaire email/mot de passe.
2. Le navigateur appelle `POST /api/auth/login` avec l’e-mail, le mot de passe
   et les deux signaux anti-spam (champ piège, délai de saisie).
3. Le serveur vérifie ces signaux, puis appelle le service d’authentification
   avec la clé **serveur** — la clé publique ne quitte jamais le navigateur
   pour cette opération.
4. La session est créée côté serveur, puis `/compte` lit l’utilisateur avec
   `supabase.auth.getUser()`, et son profil Postgres via RLS.
5. Le rôle du profil détermine l’espace de destination.
6. Chaque layout protégé revérifie le profil actif et la zone autorisée.
7. La déconnexion appelle `supabase.auth.signOut()`, puis revient à `/connexion`.

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

### 4 bis. Prévisualisation reliée à un Supabase local

Une prévisualisation servie derrière un proxy public (hôte de prévisualisation,
tunnel, passerelle) ne peut pas laisser le navigateur joindre `127.0.0.1` :
c’est l’ordinateur du visiteur qui contacte cette adresse, pas le serveur.
Trois variables facultatives résolvent ce cas sans toucher au projet hébergé :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origine publique par laquelle le navigateur joint l’application. Les appels `/auth/v1` et `/rest/v1` y sont réécrits. |
| `SUPABASE_LOCAL_PROXY_TARGET` | Cible du relais : le serveur Next relaie `/auth/v1/:path*` et `/rest/v1/:path*` vers ce Supabase local. Sans cette variable, aucune réécriture n’existe. |
| `SUPABASE_INTERNAL_URL` | Hôte joint **par le code serveur**. Sans elle, le serveur utilise l’URL publique et ne peut pas joindre un hôte interne. |

Le cookie de session ne peut pas dépendre de l’URL : `@supabase/ssr` dérive par
défaut son nom de l’hôte Supabase, ce qui rendrait le cookie écrit par le
navigateur illisible par le serveur dès que les deux ne joignent pas le même
hôte. `SUPABASE_COOKIE_NAME` (`src/shared/config/env.ts`) fixe donc un nom
unique, `sb-school-manage-auth-token`, partagé par le client navigateur, le
client serveur et le proxy. La session devient indépendante de l’URL de
déploiement.

Exemple de prévisualisation reliée au harnais E2E :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://apercu.exemple.test \
NEXT_PUBLIC_SUPABASE_ANON_KEY=cle-publique-locale-de-test \
SUPABASE_INTERNAL_URL=http://127.0.0.1:54321 \
SUPABASE_LOCAL_PROXY_TARGET=http://127.0.0.1:54321 \
npm run build

NEXT_PUBLIC_SUPABASE_URL=https://apercu.exemple.test \
NEXT_PUBLIC_SUPABASE_ANON_KEY=cle-publique-locale-de-test \
SUPABASE_INTERNAL_URL=http://127.0.0.1:54321 \
SUPABASE_LOCAL_PROXY_TARGET=http://127.0.0.1:54321 \
npm run start
```

En pratique, `npm run preview` fait le montage complet : il construit
l’application, démarre le Supabase local, attend qu’il réponde, puis sert
l’application sur le port 3200. Trois modes sont possibles, choisis par
`PREVIEW_MODE` :

| Mode | Navigateur | Serveur | Usage |
| --- | --- | --- | --- |
| `hybrid` (défaut) | Projet Supabase hébergé | Supabase local | Prévisualisation derrière un proxy public |
| `local` | Projet hébergé relayé par le serveur Next | Supabase local | Le proxy relaie aussi les appels `/auth/v1` et `/rest/v1` |
| `hosted` | Projet Supabase hébergé | Projet Supabase hébergé | La machine servant l’application atteint le projet |

Le mode `hybrid` existe parce que le proxy de prévisualisation de la
plateforme **refuse la requête d’authentification relayée par un code HTTP
403**. Ni l’application, ni Next.js, ni le harnais mock ne produisent de
403 : le refus vient du proxy, avant que la requête n’atteigne l’application.
Le navigateur appelant directement le projet Supabase hébergé, il n’est plus
exposé à ce refus ; le serveur, lui, lit le Supabase local, qu’il peut
joindre sans sortir du bac à sable.

Les identifiants de connexion sont ceux du projet hébergé, rappelés à l’écran :

| Compte | Mot de passe | Espace |
| --- | --- | --- |
| `parent.a1@example.invalid` | `SchoolDemo2026!Parent` | Espace parent, deux enfants liés |
| `direction.a@example.invalid` | `SchoolDemo2026!Direction` | Portail de l’école |
| `secretariat.a@example.invalid` | `SchoolDemo2026!Secretariat` | Portail de l’école |
| `comptable.a@example.invalid` | `SchoolDemo2026!Comptable` | Portail de l’école |
| `enseignant.a@example.invalid` | `SchoolDemo2026!Enseignant` | Espace enseignant |
| `surveillant.a@example.invalid` | `SchoolDemo2026!Surveillant` | Espace enseignant |

`SUPABASE_INTERNAL_URL` et `SUPABASE_LOCAL_PROXY_TARGET` sont lues **au
démarrage** : les Omnibus les passer au build uniquement, le serveur
retrouverait alors l’URL publique et joindrait un hôte injoignable.

En production, aucune de ces variables n’est définie : le relais est absent et
le serveur joint le projet Supabase hébergé, comme avant.

## 5. Comptes de démonstration et téléphone

Les lignes `auth.users` du seed de l’étape 2 ont un mot de passe vide et ne permettent pas de se connecter. Elles servent uniquement aux contraintes SQL. Pour tester le formulaire réel, il faut provisionner les comptes via Supabase Auth dans un environnement local autorisé et conserver la correspondance `auth.users.id = profiles.id`.

Le compte de démonstration utilisé pour la validation en ligne est provisionné par Supabase Auth (mot de passe connu, e-mail en domaine `.invalid`, profil `parent` actif, deux enfants liés) : il est créé par un script de provisionnement, jamais par le seed.

**Ce compte a été supprimé du projet hébergé** après les validations : il ne
subsiste en production aucun compte de démonstration à mot de passe connu. La
procédure de provisionnement reste documentée ici pour qu'un environnement de
test puisse en créer un à la demande ; ce compte doit être révoqué dès la fin
de la validation.

### 5 bis. Comptes de démonstration provisionnés

Pour que la connexion soit vérifiable en ligne — la prévisualisation servie
derrière un proxy public appelle le projet hébergé directement — six comptes
fictifs de l’école A portent un mot de passe :

| Compte | Rôle | Mot de passe |
| --- | --- | --- |
| `parent.a1@example.invalid` | parent, deux enfants liés | `SchoolDemo2026!Parent` |
| `direction.a@example.invalid` | direction | `SchoolDemo2026!Direction` |
| `secretariat.a@example.invalid` | secrétariat | `SchoolDemo2026!Secretariat` |
| `comptable.a@example.invalid` | comptabilité | `SchoolDemo2026!Comptable` |
| `enseignant.a@example.invalid` | enseignant | `SchoolDemo2026!Enseignant` |
| `surveillant.a@example.invalid` | surveillant | `SchoolDemo2026!Surveillant` |

Les sept autres comptes du projet hébergé restent sans mot de passe :
l’isolation entre écoles continue d’être vérifiable.

Ces identifiants sont **fictifs et publiés**. Ils servent à la validation et
doivent être révoqués à la fin de celle-ci, en remettant `encrypted_password`
à la chaîne vide :

```sql
update auth.users set encrypted_password = '' where email like '%.a@example.invalid';
```

Le mot de passe est stocké en bcrypt (`crypt(..., gen_salt('bf', 10))`), au
même coût que celui de GoTrue, et chaque compte dispose de sa ligne
`auth.identities`.

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
- Seuls Lucide React, Next.js et les clients Supabase nécessaires ont été ajoutés au runtime ; aucune bibliothèque d’animation n’est embarquée, pas plus que GSAP.
- `minimatch` est épinglé à `11.0.5` uniquement dans la dépendance de développement `@typescript-eslint/typescript-estree`, pour corriger GHSA-g3hv-75wg-m249 sans modifier les versions 3.x utilisées par les plugins ESLint.
- **Connexion par le serveur** (`POST /api/auth/login`) : la session n’est pas
  créée depuis le navigateur, et les échecs sont comptés là où un compteur
  client serait effaçable d’un simple rechargement.
- **Protection anti-spam à trois barrières** :
  - un champ piège, hors écran, hors tabulation et hors autocomplétion ; le
    formulaire ne peut pas être envoyé sans le remplir ;
  - un délai minimal de saisie de 1,2 s après l’ouverture du formulaire, ce
    qui exclut la soumission instantanée d’un robot ;
  - une limitation des tentatives côté serveur
    (`src/modules/auth/domain/login-rate-limit.ts`), qui compte les **échecs**
    et jamais les succès — un utilisateur légitime qui se connecte souvent
    n’est donc jamais bloqué.
- Deux compartiments sont suivis séparément, l’adresse d’origine et le compte
  visé, et conservés uniquement sous forme d’empreinte SHA-256 : le
  limiteur ne détient aucune adresse IP ni aucun e-mail en clair.
- Le limiteur s’applique immédiatement, sans dépendre de la base : la
  protection est active dès la première mise en ligne, avant l’application
  des migrations.
- Le formulaire valide chaque champ lui-même, en français, avec
  `aria-invalid`, `aria-describedby` et déplacement du focus vers le champ
  fautif. La validation native du navigateur est désactivée : ses bulles ne
  sont ni traduisibles, ni annoncées par un lecteur d’écran, ni associables
  au champ.

## 7. Vérifications exécutées

- **183 tests unitaires Vitest** : rôles, gardes, profils, sélecteur, configuration, classification des erreurs de connexion, champ piège, délai de saisie et limitation des tentatives.
- **56 tests SQL/RLS** de l’étape 2 conservés.
- **105 tests E2E Playwright** : manifeste et service worker, matrice responsive 320 → 1440 px, parcours parent et supervision, conformité du site.
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
