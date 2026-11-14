# Architecture de SCHOOL_MANAGE

> **Statut** : proposition — étape 1 uniquement
>
> **Date** : 2026-11-07
>
> **Périmètre** : arborescence cible, modules, conventions et plan de travail.
>
> Ce document ne crée ni application, ni migration, ni configuration d’infrastructure.

## 1. Constat de départ

Le dépôt contient uniquement `README.md` avec le titre du projet. Il n’existe actuellement :

- ni application Next.js ;
- ni configuration Supabase ;
- ni table, migration ou politique RLS ;
- ni test, documentation technique ou pipeline CI ;
- ni dépendance ou version de framework déjà imposée par le dépôt.

L’architecture est donc une proposition de départ, et non la description d’un système existant. Les versions exactes des dépendances seront fixées lors de l’initialisation, après vérification de leur compatibilité ; elles ne sont pas inventées dans ce document.

## 2. Vision et principes directeurs

SCHOOL_MANAGE est une PWA de liaison temps réel entre une école et les parents. Toute information métier publiée — note, présence/absence, paiement ou annonce — devient un événement destiné aux tuteurs autorisés des élèves concernés. L’enfant n’est jamais un intermédiaire nécessaire.

Les décisions techniques suivent six priorités, dans cet ordre :

1. **Confidentialité et isolation des écoles** : RLS active sur chaque table, contrôle des rôles et `school_id` sur chaque table métier.
2. **Parcours parent simple** : un enfant sélectionné, cinq onglets, des informations immédiatement lisibles.
3. **Faible consommation** : petites réponses, pagination, aucune vidéo lourde, aucune dépendance non justifiée.
4. **Tolérance aux coupures** : PWA installable, écrans clés disponibles en lecture hors ligne, erreurs explicites et reprise sans double écriture.
5. **Accessibilité** : français clair, clavier, contrastes, cibles tactiles d’au moins 44 × 44 px et réduction des animations.
6. **Livraisons vérifiables** : neuf étapes séquentielles, tests et autocritique avant chaque validation.

### Périmètre V1 rappelé

- Authentification, rôles et liens parent–élève à plusieurs tuteurs/enfants.
- Annonces ciblées : école, classe, tuteurs d’élèves ayant un impayé, élève unique.
- Notes, présences, frais et paiements saisis manuellement, avec reçu consultable.
- Notifications Web Push et centre de notifications.
- Lecture parent en temps réel, portails école et enseignant, accueil public animé.

### Exclusions strictes de la V1

- Sanctions avec droit de réponse, messagerie individuelle et incidents disciplinaires complets.
- Mobile Money, SMS/WhatsApp effectivement envoyés et paiement en ligne.
- Bulletins PDF, tableaux statistiques et application mobile native.
- Écriture hors ligne avec file de synchronisation : la V1 hors ligne est en lecture seule afin d’éviter les doublons et conflits.
- Toute fonctionnalité non demandée au seul motif qu’elle serait utile plus tard.

## 3. Architecture logique

### 3.1 Une seule application Next.js

Un seul projet Next.js App Router héberge :

- la page publique et son hero animé ;
- l’authentification ;
- l’espace parent ;
- le portail école ;
- l’espace enseignant/surveillant ;
- la supervision globale du management ;
- le service worker, le manifeste et les endpoints Web Push nécessaires.

Il n’y a ni monorepo ni microservice en V1. Cette simplicité réduit les déploiements, la consommation et les surfaces de sécurité.

### 3.2 Responsabilités par couche

| Couche | Responsabilité | Interdictions |
| --- | --- | --- |
| Routes Next.js | Composer les pages, appliquer les layouts et déclencher les cas d’usage | Règles métier complexes dans une page |
| UI | Affichage, formulaires, états loading/empty/error, accessibilité | Requêtes SQL dispersées dans les composants |
| Application | Cas d’usage, validation des entrées, autorisations fonctionnelles, orchestration | Dépendance à React, Next.js ou au DOM dans la logique pure |
| Domaine | Types, règles de calcul et transitions d’événements | Accès réseau, Supabase ou stockage |
| Accès aux données | Adaptateurs Supabase, requêtes minimales et mapping des erreurs | Contournement de RLS ou clé privilégiée |
| Postgres/Supabase | Contraintes, RLS, transactions, triggers d’audit et création des notifications | Confiance dans le seul contrôle effectué par l’UI |
| Edge Functions | Distribution Web Push limitée aux lots autorisés | API générale de lecture des données métier |

Les cas d’usage et le domaine sont écrits en TypeScript sans API Next.js. Ils pourront ainsi être réutilisés par une éventuelle application native après validation de la PWA. Les adaptateurs d’accès aux données remplacent les ports sans réécrire les règles métier.

### 3.3 Flux de lecture et d’écriture

**Lecture**

1. Le layout authentifié vérifie la session Supabase et le profil actif.
2. Un cas d’usage demande uniquement les colonnes nécessaires via l’adaptateur Supabase.
3. Postgres applique la RLS avec le JWT de l’utilisateur ; aucun filtre applicatif ne remplace cette barrière.
4. La page rend un état de chargement, vide, erreur ou succès explicite.
5. Les mises à jour Realtime sont ciblées et déclenchent une revalidation limitée, plutôt qu’un rechargement complet.

**Écriture**

1. L’utilisateur confirme une action métier ; aucune notification n’est émise à chaque frappe.
2. Le cas d’usage valide les données, les droits fonctionnels et l’identifiant d’école attendu.
3. L’adaptateur Supabase utilise le JWT de l’utilisateur. Une Server Action peut servir de point d’entrée Next.js, mais ne contient pas de logique métier propre au web.
4. Les contraintes et politiques RLS rejettent toute requête invalide, même si l’UI a été contournée.
5. Une transaction écrit la donnée, l’audit et les événements de notification nécessaires.
6. L’interface affiche le résultat confirmé ; elle ne prétend pas qu’un paiement ou une note est enregistré avant la réponse du serveur.

Aucune clé `service_role`, aucun rôle `BYPASSRLS` et aucune désactivation de RLS ne sont utilisés dans les parcours applicatifs. Une fonction Postgres à droits élevés ne peut être envisagée que si elle conserve l’application effective des politiques, possède des privilèges minimaux et fait l’objet de tests négatifs ; sinon, la conception devra être revue avant implémentation.

## 4. Modules fonctionnels

Les modules d’acteurs composent des capacités métier partagées. Cela évite, par exemple, deux implémentations différentes de la saisie des notes pour l’école et l’enseignant.

| Module | Responsabilités principales | Étape de livraison |
| --- | --- | --- |
| `auth` | Connexion, déconnexion, session, rôle actif, redirection et garde de layout | 3 |
| `parent` | Sélecteur d’enfant, cinq onglets en lecture seule, centre de notifications | 3 puis 5 (livré) et 7 |
| `school` | Coquille du portail direction/secrétariat/comptable et navigation selon les droits | 3 puis 6 |
| `teacher` | Coquille enseignant/surveillant et accès aux saisies autorisées | 3 puis 6 |
| `students` | Référentiel élève, classe et liens avec les tuteurs | 2 ; interfaces seulement si prévues dans une étape validée |
| `grades` | Validation d’une note, période, matière, publication et lecture parent | 2, 5 et 6 |
| `attendance` | Présence/absence, date scolaire, commentaire bref et lecture parent | 2, 5 et 6 |
| `payments` | Frais, solde d’un élève, encaissement manuel et reçu non-PDF | 2, 5 et 6 |
| `announcements` | Ciblage, publication, diffusion et accusé de lecture | 2, 5, 6 et 7 |
| `notifications` | Préférences techniques, abonnement push, centre lu/non lu et repli à brancher | 7 |
| `supervision` | Vue d’ensemble globale du management : totaux par école, répartition des comptes, totaux financiers par devise | 6 (livré) |
| `pwa` | Manifeste, installation, service worker, caches et indicateur hors ligne | 4 |
| `public-home` | Hero public à cinq scènes et contrôles d’animation | 8 |

### 4.1 Module parent

Le détail de l’espace parent livré à l’étape 5 (routes, règles de lecture,
états, tests) est documenté dans `docs/ESPACE-PARENT.md`.

- Un parent peut consulter plusieurs enfants et un élève peut avoir plusieurs tuteurs autorisés.
- L’enfant sélectionné fait partie de l’URL afin que le partage, le rafraîchissement et le cache ne mélangent pas les enfants.
- Le sélecteur ne propose que les enfants autorisés, mais la RLS revérifie chaque accès à l’identifiant fourni.
- Les cinq destinations sont `Résumé`, `Résultats`, `Vie scolaire`, `Paiements` et `Infos`.
- Le parent ne modifie aucune note, présence, aucun frais ou paiement. Ses seules mutations prévues sont son abonnement push et l’état de lecture de ses notifications.
- Le centre de notifications est personnel ; les données d’un enfant restent soumises au lien tuteur actif.

### 4.2 Module école

Le portail mutualise la navigation, tout en appliquant une autorisation par action et non seulement par menu.

| Rôle | Droits fonctionnels V1 proposés |
| --- | --- |
| Direction | Toutes les opérations de son école, publication et consultation opérationnelle |
| Secrétariat | Annonces, élèves/liens utiles au ciblage, présences selon la matrice finale de l’étape 2 |
| Comptable | Frais, paiements, reçus et informations élève strictement nécessaires ; pas d’accès aux notes |
| Enseignant | Notes et présences de son école selon la matrice finale ; aucune fonction comptable |
| Surveillant | Présences de son école ; aucune fonction de notes ou de comptabilité |

La RLS applique ces distinctions en base. Masquer un bouton n’est jamais considéré comme une protection.

### 4.3 Module enseignant

- Accès direct aux formulaires de notes et de présences, sans menus comptables ou d’administration.
- Formulaires adaptés au tactile, enregistrement explicite et confirmation non ambiguë.
- Listes paginées ou limitées à une classe afin d’éviter l’envoi de centaines de lignes sur un réseau faible.
- En l’absence d’une table d’affectation enseignant–classe dans la liste V1 imposée, aucune affectation fine ne sera simulée côté client. Ce manque est signalé comme limite à trancher lors de l’étape 2 ; l’étendue par défaut doit rester la plus restrictive possible.

### 4.4 Module supervision

La supervision globale du management est livrée à l’étape 6. Son détail
(routes, rôle, isolation, tests) figure dans `docs/SUPERVISION.md`.

- Le rôle `super_admin` est transverse : il n’appartient à aucune école et suit
  l’ensemble des écoles de la plateforme.
- La page `/supervision` est une vue d’ensemble **consultative** : elle
  n’écrit rien et n’ajoute aucune capacité de gestion métier.
- Trois barrières Protègent l’accès : le routage applicatif (`requireArea`),
  les politiques RLS de lecture seule, et le helper interne `is_super_admin()`.
- Les autres rôles conservent strictement leur périmètre : une école ne voit
  que la sienne, un parent que ses enfants liés.
- Les montants ne sont jamais cumulés entre devises : les totaux financiers
  sont regroupés par devise.

## 5. Modèle de données et cohérence multi-tenant

Le détail SQL et les politiques seront produits à l’étape 2, mais l’architecture fixe les invariants suivants.

### 5.1 Tables demandées

| Groupe | Tables prévues | Invariants essentiels |
| --- | --- | --- |
| Tenant et identité | `schools`, `profiles` | Un profil applicatif correspond à un utilisateur Auth ; rôle et école contrôlés côté base |
| Référentiel scolaire | `classes`, `subjects`, `periods`, `students` | Toutes les lignes sont rattachées à leur école ; une période définit les bornes de saisie |
| Liens | `guardian_links` | Couple tuteur–élève unique, lien actif révocable, même école pour les deux extrémités |
| Événements scolaires | `grades`, `attendance` | Élève, école et contexte pédagogique cohérents ; pas de doublon métier |
| Finances | `fees`, `payments` | Montants entiers en unité monétaire minimale, jamais en flottant ; frais assortis d’une échéance et paiement rattaché à un frais, un élève et son école |
| Communication | `announcements`, `announcement_targets` | Cible explicite et destinataires recalculés uniquement selon les règles autorisées |
| Information | `notifications` | Destinataire, élève concerné, événement source et `read_at` ; pas de lecture par un autre parent |
| Traçabilité | `audit_log` | Journal append-only pour l’application, acteur, école, action, entité et horodatage |

`push_subscriptions` sera ajouté au plus tôt à l’étape 7, avec `school_id` et RLS, car elle n’est pas nécessaire avant Web Push. Aucune autre table n’est présumée autorisée automatiquement.

### 5.2 Isolation

- `schools` est la racine du tenant et utilise sa clé `id` ; toute autre table métier porte `school_id`, y compris les tables de jonction, notifications et audit.
- Les clés étrangères composites ou contraintes équivalentes empêchent de relier deux lignes d’écoles différentes ; un simple `student_id` valide ne suffit pas.
- Chaque table a des politiques distinctes pour SELECT, INSERT, UPDATE et DELETE selon les besoins.
- Le parent accède à un élève uniquement via un `guardian_links` actif et au même tenant.
- Le personnel est limité à `profiles.school_id` ; un `school_id` envoyé par le navigateur n’est jamais une preuve.
- Le contenu de `audit_log` n’est ni modifiable ni supprimable par les rôles applicatifs.
- Les tests de l’étape 2 doivent prouver les refus de lecture **et d’écriture**, entre parents et entre deux écoles.
- Exception explicite et bornée : le rôle `super_admin` de l’étape 6 dispose
  de politiques de **lecture seule** sur toutes les tables. Il est transverse
  (`profiles.school_id` nul), ne peut rien écrire, et sa désactivation coupe
  immédiatement son accès.

### 5.3 Hypothèse de tenant V1

Pour limiter les ambiguïtés de session et de cache, la proposition V1 rattache un compte à une seule école. Les enfants d’un même parent consultés dans ce compte appartiennent donc à cette école. Le cas d’un parent ayant des enfants dans plusieurs écoles nécessiterait une appartenance multi-écoles et un sélecteur de tenant ; il n’est pas ajouté silencieusement à la V1.

De même, `students` porte la classe courante : aucune table d’historique des inscriptions n’étant demandée, l’historique complet des changements de classe n’est pas promis.

### 5.4 Temps, argent et identifiants

- Identifiants UUID générés côté base ; aucune donnée réelle d’élève dans les seeds.
- Horodatages `timestamptz` en UTC ; dates de présence en `date` scolaire.
- Fuseau, locale et devise consultés depuis les paramètres de l’école, sans valeur monétaire codée en dur dans les composants.
- Formatage avec `Intl`, en français ; les seeds pourront utiliser un contexte explicitement fictif de Brazzaville et le XAF.
- Reçu : identifiant lisible unique par école, date, élève, montant, motif, comptable et horodatage. Un écran imprimable simple ne devient pas un bulletin PDF.

## 6. Événements, notifications et audit

### 6.1 Catalogue d’événements V1

| Événement confirmé | Destinataires | Information parent |
| --- | --- | --- |
| Note publiée ou corrigée | Tuteurs actifs de l’élève | Résultats et résumé actualisés |
| Présence/absence enregistrée ou corrigée | Tuteurs actifs de l’élève | Vie scolaire et résumé actualisés |
| Paiement enregistré | Tuteurs actifs de l’élève | Paiements, reçu et solde actualisés |
| Annonce publiée | Tuteurs des élèves correspondant à la cible | Infos et centre de notifications |
| Notification ouverte | Le parent concerné uniquement | Accusé de lecture |

Un brouillon ou une saisie non confirmée ne déclenche pas de notification. Une correction déclenche un nouvel événement explicite plutôt que d’altérer l’historique d’audit.

### 6.2 Résolution des cibles

Les cibles possibles sont exactement : toute l’école, une classe, les tuteurs d’élèves avec impayé et un élève. Pour une annonce générale, le principe « tout est rattaché à un élève » est conservé au moment de la distribution : chaque notification est associée à l’élève qui justifie sa réception.

Les règles proposées sont :

- figer la cible et les destinataires au moment de la publication pour permettre l’audit ;
- dédupliquer un même parent pour un même élève et une même annonce ;
- ne pas fusionner silencieusement deux enfants : l’UI peut regrouper visuellement, mais conserve la justification de chaque envoi ;
- traiter les grandes diffusions par petits lots pour éviter les pics et les délais d’expiration ;
- ne jamais exposer la liste des autres destinataires dans la charge utile reçue par un parent.

### 6.3 Web Push et Realtime

- Le centre de notifications Postgres est la source de vérité ; Web Push est un moyen de réveil, pas le stockage principal.
- Les payloads push sont minimaux, sans note détaillée, montant, nom complet d’élève ou liste de destinataires sur l’écran verrouillé.
- L’Edge Function de l’étape 7 ne doit pas obtenir un accès général aux tables métier. La résolution des destinataires et les droits de lecture des abonnements seront spécifiés et testés sans désactiver ni contourner la RLS.
- Les secrets VAPID et secrets d’appel résident uniquement dans les variables d’environnement de l’Edge Function.
- Les canaux Realtime sont privés et limités aux données que l’utilisateur peut déjà lire via RLS. Un canal école ouvert à tous les parents est interdit.
- Une interface `sms_whatsapp_provider` pourra décrire le contrat de repli à l’étape 7, sans SDK, appel réseau ni envoi effectif.

### 6.4 Audit

Chaque mutation métier sensible consigne au minimum : école, acteur, action, type et identifiant d’entité, date, identifiant de corrélation et modifications utiles. Les secrets, tokens push, mots de passe et contenus sensibles non nécessaires ne sont pas journalisés. L’audit ne sert pas à fabriquer des statistiques exclues de la V1.

## 7. Arborescence cible

Cette arborescence est une destination, pas une liste de fichiers à créer immédiatement. Chaque étape ne crée que ses propres livrables ; les dossiers vides et composants spéculatifs sont évités.

```text
SCHOOL_MANAGE/
├── .github/
│   └── workflows/
│       └── ci.yml                         # Vérifications automatisées, après le socle
├── docs/
│   ├── ARCHITECTURE.md                    # Étape 1
│   ├── AUTHENTICATION.md                  # Étape 3
│   ├── PWA.md                             # Étape 4
│   ├── ESPACE-PARENT.md                   # Étape 5
│   ├── SUPERVISION.md                     # Étape 6
│   └── SECURITE.md                        # Étape 2
├── public/
│   ├── icons/                             # Icônes PWA et maskables — étape 4
│   └── sw.js                              # Service worker — étape 4, enrichi en 7
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # HTML, langue, styles et métadonnées communes
│   │   ├── page.tsx                       # Accueil public — étape 8
│   │   ├── manifest.ts                    # Manifeste PWA — étape 4
│   │   ├── offline/
│   │   │   └── page.tsx                   # Repli hors ligne — étape 4
│   │   ├── (auth)/
│   │   │   └── connexion/
│   │   │       └── page.tsx               # Étape 3
│   │   └── (authenticated)/
│   │       ├── layout.tsx                 # Session et garde commune — étape 3
│   │       ├── parent/
│   │       │   ├── page.tsx               # Sélecteur d’enfant — étape 5
│   │       │   ├── not-found.tsx          # Enfant non rattaché — étape 5
│   │       │   ├── notifications/
│   │       │   │   └── page.tsx           # Centre personnel — étape 7
│   │       │   └── [studentId]/
│   │       │       ├── layout.tsx         # Sélecteur d’enfant et onglets — étape 5
│   │       │       ├── page.tsx           # Résumé — étape 5
│   │       │       ├── loading.tsx        # Squelette de chargement — étape 5
│   │       │       ├── error.tsx          # Erreur et reprise — étape 5
│   │       │       ├── not-found.tsx      # Enfant non rattaché — étape 5
│   │       │       ├── resultats/page.tsx # Résultats — étape 5
│   │       │       ├── vie-scolaire/page.tsx
│   │       │       ├── paiements/page.tsx
│   │       │       └── infos/page.tsx
│   │       ├── ecole/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── notes/page.tsx
│   │       │   ├── presences/page.tsx
│   │       │   ├── paiements/page.tsx
│   │       │   └── annonces/page.tsx
│   │       ├── enseignant/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── notes/page.tsx
│   │       │   └── presences/page.tsx
│   │       └── supervision/
│   │           ├── layout.tsx              # Zone admin, garde de rôle — étape 6
│   │           └── page.tsx               # Vue d'ensemble globale — étape 6
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── application/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── ui/
│   │   ├── parent/
│   │   ├── school/
│   │   ├── teacher/
│   │   ├── super-admin/                   # Supervision globale — étape 6
│   │   ├── students/
│   │   ├── grades/
│   │   ├── attendance/
│   │   ├── payments/
│   │   ├── announcements/
│   │   ├── notifications/
│   │   ├── pwa/
│   │   └── public-home/
│   ├── shared/
│   │   ├── config/                        # Lecture validée des variables publiques
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Client navigateur, JWT utilisateur
│   │   │   ├── server.ts                  # Client serveur, JWT utilisateur
│   │   │   └── database.types.ts          # Types générés, jamais édités à la main
│   │   ├── ui/                            # Primitives accessibles et états communs
│   │   ├── format/                        # Dates, nombres et monnaie via Intl — étape 5
│   │   └── observability/                 # Erreurs sans données scolaires sensibles
│   ├── messages/
│   │   └── fr.json                        # Libellés français, préparation i18n
│   └── styles/
│       └── globals.css                    # Tokens Tailwind/CSS et reduced motion
├── supabase/
│   ├── config.toml                        # Configuration locale, sans secret
│   ├── migrations/                        # Étape 2 puis ajouts strictement nécessaires
│   ├── seed.sql                           # Données explicitement fictives
│   ├── tests/                             # Tests RLS et contraintes — étape 2
│   └── functions/
│       └── dispatch-notifications/        # Edge Function Web Push — étape 7
├── tests/
│   └── e2e/                               # Parcours critiques Playwright
│       ├── mock-supabase.mjs              # Serveur Supabase local de test — étape 5
│       ├── mesures.mjs                    # Mesures responsive partagées
│       ├── parent-space.spec.mjs          # Espace parent — étape 5
│       ├── supervision.spec.mjs           # Supervision globale — étape 6
│       ├── pwa.spec.mjs
│       └── responsive.spec.mjs
├── .env.example                           # Noms uniquement, aucune valeur secrète
├── package.json
├── README.md                              # Installation et déploiement — étape 9
└── tsconfig.json
```

### Règles de dépendances entre dossiers

- `app` peut composer `modules` et `shared`, mais ne contient pas les règles métier.
- Un module d’acteur (`parent`, `school`, `teacher`, `super-admin`) peut utiliser les cas d’usage des modules métier.
- Un module métier ne dépend pas d’un module d’acteur ni d’un composant de page.
- `domain` ne dépend ni de `data`, ni de `ui`, ni de Next.js.
- Les imports partagés passent par des points d’entrée explicites ; aucun import circulaire entre modules.
- `shared` ne devient pas un dépôt fourre-tout : une règle propre à une capacité reste dans son module.

## 8. Conventions de nommage et de code

### 8.1 TypeScript et React

| Élément | Convention | Exemple |
| --- | --- | --- |
| Fichiers et dossiers | `kebab-case` | `child-selector.tsx` |
| Composants et types de composant | `PascalCase` | `ChildSelector` |
| Fonctions, variables et hooks | `camelCase`, hooks préfixés par `use` | `getStudentBalance`, `useOnlineStatus` |
| Types métier | `PascalCase`, suffixes explicites | `AnnouncementTarget`, `PaymentReceipt` |
| Cas d’usage | Verbe + objet | `publishAnnouncement`, `recordPayment` |
| Adaptateurs Supabase | Suffixe `supabase` au fichier | `payments.supabase.ts` |
| Tests | Nom du sujet + `.test.ts` ou `.spec.ts` | `permissions.test.ts` |
| Routes visibles | Français, minuscules, sans accents | `/parent/[studentId]/vie-scolaire` |
| Messages i18n | Clés stables par domaine | `parent.payments.empty` |

Les identifiants techniques sont en anglais pour rester cohérents avec les noms de tables imposés. Les libellés visibles sont en français et centralisés ; aucune phrase utilisateur importante n’est dispersée en dur dans les composants.

### 8.2 Base de données

- Tables, colonnes, fonctions et contraintes en `snake_case`.
- Clés étrangères suffixées par `_id` ; noms de contraintes explicites.
- Valeurs d’enum courtes et stables, documentées dans `docs/SECURITE.md`.
- Colonnes communes : `id`, `school_id`, `created_at`, puis `updated_at` uniquement si la modification est permise.
- Migrations nommées `YYYYMMDDHHMMSS_verbe_objet.sql`, une intention par migration.
- Toute nouvelle table métier est créée dans la même migration que son `school_id`, ses index de sécurité, sa RLS et ses politiques initiales.
- Aucune migration destructive ou exécution sur la production sans validation explicite et sauvegarde adaptée.
- Seeds clairement fictifs, reproductibles et séparés des migrations de structure.

### 8.3 UI, icônes et animation

- Mobile-first à partir de 360 px, sans horizontal scroll, puis adaptations à 768 px et desktop.
- Cibles tactiles minimales de 44 × 44 px, focus visible et navigation clavier systématique.
- Lucide React exclusivement ; imports nommés pour le tree-shaking. Taille courante 20 ou 24 px, trait cohérent, icône décorative masquée aux technologies d’assistance.
- Les icônes parent prévues sont `GraduationCap`, `CalendarCheck`, `Wallet`, `Megaphone` et `Bell`, accompagnées d’un libellé.
- Tokens de couleurs, espacements, rayons et typographie plutôt que valeurs dispersées. Les contrastes sont mesurés, pas seulement estimés.
- CSS pour les transitions simples ; Motion pour les séquences et le hero. GSAP n’est pas prévu et ne pourrait être ajouté qu’avec une justification écrite validée.
- Animations limitées à `transform` et `opacity`, avec alternative `prefers-reduced-motion`.

### 8.4 Git et revues

- Commits atomiques au format Conventional Commits, par exemple `docs: définir l’architecture initiale`.
- Le flux Git normal prévoit une branche par étape. Dans l’environnement Arena, la branche de session imposée reste `arena/a2c74eab-school-manage` ; aucune autre branche n’est créée depuis cette session.
- Une étape ne contient ni refactorisation sans rapport ni fonctionnalité de l’étape suivante.
- La revue de fin d’étape liste les tests réellement exécutés et leurs résultats ; aucun test non lancé n’est présenté comme réussi.

## 9. Sécurité et confidentialité

Les détails et preuves appartiennent à l’étape 2 ; les garde-fous architecturaux sont :

1. **RLS partout** : activation immédiate, politiques de lecture et d’écriture, tests inter-parents et inter-écoles.
2. **Aucun privilège secret dans l’application** : seules les valeurs publiques Supabase sont exposées au navigateur ; pas de clé de service dans Next.js ou le service worker.
3. **Autorisation à plusieurs niveaux** : navigation, cas d’usage et base, la base restant décisive.
4. **Sessions** : cookies gérés par l’intégration Supabase/Next.js, déconnexion et expiration testées ; rôle stocké en base plutôt que choisi par le client.
5. **Données minimales** : sélection de colonnes, payloads push minimaux et logs sans informations scolaires sensibles.
6. **Caches privés maîtrisés** : partition par compte et tenant, purge à la déconnexion/changement de compte, jamais de cache partagé entre parents.
7. **Audit append-only** : aucune modification/suppression applicative de l’historique.
8. **Environnements séparés** : développement local et données fictives ; aucune action de production automatisée dans les neuf étapes.

## 10. PWA, réseau faible et performance

### 10.1 Stratégie de cache

Le service worker de l’étape 4 distingue :

- **App shell et ressources statiques versionnées** : mise en cache prévisible, nettoyage des anciennes versions à l’activation.
- **Coquilles des écrans Résumé, Résultats et Paiements** : stale-while-revalidate, avec repli hors ligne clairement indiqué.
- **Dernières données privées effectivement nécessaires à ces écrans** : cache séparé et namespacé par utilisateur/école/enfant, purge à la déconnexion et au changement de compte. Aucun contenu d’un parent ne peut être servi à un autre compte.
- **Authentification, mutations, paiements en écriture, endpoints push et tokens** : jamais mis en cache.
- **Realtime** : pas de réponse synthétique hors ligne ; l’interface indique la date de dernière synchronisation plutôt que de présenter une donnée comme temps réel.

La stratégie détaillée devra éviter de mettre en cache une réponse RSC privée sous une URL générique. En cas de doute, la coquille non sensible est conservée et la donnée privée n’est pas persistée plutôt que de risquer une fuite.

### 10.2 Comportement dégradé

- Le hors ligne est en lecture seule ; aucun bouton ne laisse croire qu’une écriture a abouti.
- Les erreurs réseau proposent « Réessayer » sans recharger toute l’application.
- Les formulaires conservent localement la saisie en mémoire après une erreur, sans l’enregistrer dans un stockage persistant non sécurisé.
- Les requêtes sont petites et limitées : colonnes nécessaires, listes paginées, pas de chargement de toute l’école pour afficher un enfant.
- Les mises à jour Realtime sont regroupées et ignorées lorsque l’onglet est masqué si une revalidation au retour suffit.
- Les polices sont auto-hébergées via le mécanisme Next.js ou système ; aucune police distante bloquante.
- Le hero est chargé séparément des espaces authentifiés, s’arrête hors écran/onglet et ne contient ni vidéo ni grande image.

### 10.3 Budgets initiaux à mesurer

Ces budgets sont des objectifs de revue, pas des résultats déjà obtenus :

- Lighthouse ≥ 90 sur les catégories demandées, sur build de production et appareil mobile simulé.
- Interface utilisable à 360 px, cibles ≥ 44 px et aucun contenu essentiel dépendant du survol.
- Listes initiales limitées à une page courte (ordre de grandeur 20 à 50 lignes selon l’écran), sans exposition de données supplémentaires.
- Aucun GSAP, SDK SMS, SDK natif ou moteur de graphiques en V1.
- LCP et stabilité visuelle mesurés sur profil mobile réseau lent ; toute régression documentée avant optimisation.

Si la version de Lighthouse retenue ne propose plus la catégorie PWA historique, le rapport indiquera honnêtement les audits disponibles et une checklist PWA équivalente, sans inventer de score.

## 11. Accessibilité et i18n

- `lang="fr"` à la racine et libellés externalisés dès leur création.
- Une hiérarchie de titres, landmarks et liens d’évitement adaptés à chaque layout.
- Formulaires avec label visible, instructions et erreurs reliées par les attributs ARIA appropriés.
- États loading/empty/error annoncés sans répétitions agressives ; le chargement ne remplace pas le focus de façon intempestive.
- Dialogues et menus avec gestion du focus, fermeture clavier et retour au déclencheur.
- Les onglets parent restent utilisables comme navigation même si JavaScript d’animation est indisponible.
- Le hero de l’étape 8 propose pause, indicateurs cliquables, pause au survol/toucher et respect de `prefers-reduced-motion`.
- Formats de date et monnaie via `Intl` ; les clés de traduction ne contiennent pas de balisage arbitraire.

## 11 bis. Stratégie responsive

Le public des parents est majoritairement sur téléphone et tablette ; les personnels de l’école travaillent sur ordinateur. La conception est donc **mobile-first**, pas desktop-first.

- **Un seul point de rupture CSS** : Tailwind v4 compile `sm` (40 rem), `md` (48 rem), `lg` (64 rem) et `xl` (80 rem). LAudit réalisé en novembre 2026 relevait un seul point de rupture (640 px) sur l’ensemble de l’application, avec une colonne unique centrée sur 512 px : le problème était de design, pas de débordement.
- **Mobile (320–639 px)** : contenu pleine largeur, marges de 16 px, actions empilées, en-tête compact, bouton de déconnexion réduit à son icône (libellé conservé pour les lecteurs d’écran).
- **Tablette (640–1023 px)** : grilles à 2 colonnes, cartes d’enfant côte à côte, formulaires sur une colonne centrée.
- **Ordinateur (≥ 1024 px)** : contenu élargi à `max-w-6xl`, grilles à 3 colonnes, marges latérales de 32 px, portail école en paysage.
- **Zones sûres** : `viewport-fit=cover` et les variables `--safe-top/right/bottom/left` alimentées par `env(safe-area-inset-*)` ; le bas de page réserve `--safe-bottom` pour ne pas masquer le contenu derrière la barre système.
- **Aucune barre de défilement horizontale** : `overflow-x: clip` sur `body` et des grilles `min-w-0` sur les conteneurs de texte long.
- **Saisie sans zoom iOS** : tous les champs utilisent une police de 16 px minimum (`input, select, textarea { font-size: max(1rem, 16px) }`).
- **Cibles tactiles** : 44 px minimum sur toutes les cibles interactives, vérifié automatiquement.
- **Tests** : `tests/e2e/responsive.spec.mjs` rejoue la matrice 320 / 360 / 390 / 768 / 1024 / 1440 px sur les pages publiques et vérifie débordement, taille des cibles, taille de police et adaptation réelle des colonnes.

## 12. Tests et qualité

| Niveau | Outil proposé | Justification et périmètre |
| --- | --- | --- |
| SQL/RLS | PGlite + `node:test` (étapes 2 et 5) | PostgreSQL réel en WASM, migrations et seed réels ; accès refusés et cohérence des tenants |
| Domaine | Vitest (étapes 3 et 5) | Tests rapides des règles pures, cibles, montants et permissions fonctionnelles |
| Composants | Vitest sur le domaine, rendu vérifié par Playwright | Pas de bibliothèque de rendu supplémentaire à ce stade ; les états sont contrôlés dans les parcours |
| Parcours | Playwright (étapes 4 et 5) | Connexion, navigation parent, états d’erreur et responsive sur les cinq onglets |
| Doublure Supabase | `tests/e2e/mock-supabase.mjs` (étape 5) | Permet de parcourir l’espace parent connecté sans accès au projet hébergé ; données fictives |
| Accessibilité | Playwright, vérifications clavier et audit automatisé complété manuellement | Un outil automatique seul ne prouve ni le focus ni la compréhension |
| PWA/performance | Build de production, Lighthouse et tests manuels hors ligne | Vérification du SW réel, pas seulement du serveur de développement |

Les outils de test sont des dépendances de développement justifiées par les étapes 2 et 9 ; ils ne sont pas embarqués dans le bundle utilisateur. La CI devra exécuter les vérifications adaptées à chaque étape, sans secrets de production et avec Supabase local.

État au terme de l’étape 5 : `npm run test:unit` (95), `npm run test:db` (40) et `npm run test:e2e` (68) passent ; `npm run lint`, `npm run typecheck` et `npm run build` ne signalent aucune erreur.

### Jeu minimal de tests de sécurité attendu

- Deux écoles A et B, chacune avec personnel, classes, élèves, tuteurs et événements fictifs.
- Un parent A avec deux enfants, un autre parent A sans lien avec ces enfants et deux tuteurs partageant un même enfant.
- Tentatives de lecture et mutation avec les identifiants de l’autre parent et de l’école B.
- Tentatives de modification du `school_id`, du rôle, du tuteur et de l’élève dans une requête.
- Comptable empêché de lire les notes ; enseignant empêché d’enregistrer un paiement.
- Révocation d’un lien tuteur et vérification que les lectures et abonnements temps réel ne conservent pas un accès indu.
- Déconnexion/changement de compte avec vérification qu’aucun cache privé ne fuit.

## 13. Dépendances prévues et justification

| Dépendance | Usage | Motif |
| --- | --- | --- |
| `next`, `react`, `typescript`, Tailwind CSS | Application et styles | Stack imposée |
| `@supabase/supabase-js` et intégration SSR officielle | Auth, Postgres, Realtime et session | Stack imposée, JWT utilisateur conservé |
| `lucide-react` | Icônes | Seule bibliothèque d’icônes autorisée |
| `motion` | Séquences d’animation lorsque nécessaire | Stack autorisée ; import limité aux composants concernés |
| Supabase CLI | Base locale, migrations et tests | Reproductibilité sans toucher à la production ; validation requise avant tout environnement distant |
| `@electric-sql/pglite` | Tests SQL de l’étape 2 | PostgreSQL réel en WASM sans Docker, uniquement en développement et hors bundle ; voir `docs/SECURITE.md` |
| Vitest/Testing Library/Playwright | Tests | Couverture exigée par le plan, dépendances de développement |

Aucune validation de formulaire, gestion d’état global ou bibliothèque de requêtes supplémentaire n’est retenue à ce stade. Les APIs React, les petits schémas de validation nécessaires et les requêtes Supabase suffisent pour commencer. Si une limite réelle apparaît, l’ajout sera justifié par écrit avec son poids et son alternative avant installation.

## 14. Plan de travail séquentiel

Chaque ligne est une porte de validation : l’étape suivante ne commence qu’après autocritique et accord explicite.

| Étape | Livrables | Critères de sortie principaux |
| --- | --- | --- |
| **1 — Architecture** | Ce document | Dépôt lu, arborescence/modules/conventions/plan proposés, aucun code créé, autocritique effectuée |
| **2 — Base et sécurité** | Migrations des 15 tables demandées, RLS, contraintes, audit, seeds fictifs, tests SQL, `docs/SECURITE.md` | Tests locaux inter-parents/inter-écoles réussis ; aucune migration destructive ni action production |
| **3 — Auth et rôles** | Supabase Auth email/mot de passe, téléphone seulement si réalisable sans dérive, redirections, trois layouts, sélecteur d’enfant | Rôle non modifiable côté client, routes protégées, aucun contenu métier anticipé |
| **4 — Socle PWA** | Manifeste, icônes maskables, installation, SW, caches SWR, indicateur hors ligne, base 360 px | Build de production testé, coupure réseau vérifiée, aucun cache inter-comptes, audit Lighthouse honnête |
| **5 — Écrans parent** | Résumé, Résultats, Vie scolaire, Paiements, Infos ; états complets et lecture RLS — **livré, voir `docs/ESPACE-PARENT.md`** | Parent multi-enfants sans fuite, lecture seule, petits écrans et réseau lent testés |
| **6 — Portail école** | Saisies notes/présences, paiements et reçus, annonces aux quatre cibles, accusés de lecture, audit | Permissions par rôle testées, aucune notification prématurée, chaque action tracée |
| **7 — Notifications** | Abonnement Web Push, distribution Edge, centre lu/non lu, contrat de repli SMS/WhatsApp non implémenté | Payloads minimaux, destinataires exacts, désabonnement et échecs traités, aucun envoi SMS/WhatsApp |
| **8 — Accueil animé** | Hero public de cinq scènes, mockups SVG/CSS/Motion et contrôles accessibles — **livré, voir `docs/ACCUEIL-PUBLIC.md`** | Rotation 4–5 s, pause, indicateurs, stagger, reduced motion, transform/opacity uniquement |
| **9 — Finalisation** | Tests critiques, audits Lighthouse/accessibilité/hors ligne, README installation/env/Vercel, risques restants | Résultats reproductibles, risques classés, aucune mise en production effectuée sans validation |

### Ordre technique interne recommandé

- **Étape 2** : tenant/profils → référentiel/liens → événements/finances → annonces/notifications → audit → seeds → tests négatifs.
- **Étape 3** : clients Supabase sans privilège → session → rôles/layouts → sélecteur d’enfant → tests de redirection.
- **Étapes 5 et 6** : lecture et écriture d’abord sans push ; l’événement et l’audit restent la base de l’étape 7.
- **Étape 8** : scène statique accessible d’abord, animation ensuite comme amélioration progressive.

## 15. Décisions différées et risques à surveiller

Ces points ne justifient pas de coder maintenant, mais devront être tranchés dans leur étape, sans élargir silencieusement le périmètre :

| Sujet | Décision nécessaire | Risque si mal traité |
| --- | --- | --- |
| Affectation enseignant–classe | Matrice restrictive avec les tables V1 ou demande explicite d’évolution | Un enseignant pourrait modifier trop d’élèves |
| Parent dans plusieurs écoles | Confirmer l’hypothèse mono-école avant les contraintes SQL | Verrouillage du modèle ou fuite de tenant |
| Gestion CRUD des comptes et liens | Déterminer si les parcours prévus suffisent ou si un écran doit être ajouté au périmètre validé | Provisionnement manuel non couvert par les tests UI |
| Publication/correction des notes et présences | Définir les transitions qui notifient | Spam ou notification de données non finalisées |
| Impayés | Définir échéance et solde dû à la publication | Ciblage de parents non concernés |
| Cache de données privées | Mesurer le besoin hors ligne et tester la purge | Exposition sur appareil partagé |
| Diffusion de masse | Tailles de lots, reprises et idempotence à l’étape 7 | Notifications perdues ou dupliquées |
| Téléphone/SMS | Auth téléphone possible selon Supabase ; SMS de repli non implémenté | Coût, dépendance externe et dépassement V1 |
| Historique de classe | Ne pas promettre sans table d’inscriptions | Incohérence des bulletins ou événements anciens |

## 16. Critères de réussite de la V1

La V1 sera considérée comme techniquement prête pour une décision de mise en production — et non automatiquement déployée — lorsque :

- un parent ne peut accéder qu’à ses enfants liés et une école qu’à son tenant, preuves SQL à l’appui ;
- les rôles restreignent réellement les mutations et les données visibles ;
- un événement confirmé produit une notification dédupliquée et traçable pour chaque tuteur concerné ;
- les parcours parent et personnel restent compréhensibles à 360 px, au clavier et sur connexion instable ;
- la PWA s’installe et affiche honnêtement l’état hors ligne sans risque de fuite par cache ;
- les rapports de tests indiquent les échecs et limites réels ;
- le README permet une installation locale reproductible sans secret commité ;
- les risques restants sont documentés et la production n’a subi aucune action non validée.
