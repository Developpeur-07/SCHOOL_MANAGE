# Espace parent — cinq onglets en lecture seule (étape 5)

Ce document décrit l’espace parent livré à l’étape 5 : les cinq onglets
`Résumé`, `Résultats`, `Vie scolaire`, `Paiements` et `Infos`, leurs états
d’affichage, les règles de lecture appliquées et les tests qui les couvrent.

L’étape 5 est **strictement en lecture seule** : aucune saisie, aucune
validation, aucun contrôle d’écriture n’est rendu au parent. Les écrans de
saisie appartiennent au portail école (étape 6).

---

## 1. Routes

| Route | Onglet | Contenu |
| --- | --- | --- |
| `/parent` | — | Redirection vers l’unique enfant, sinon sélecteur d’enfant |
| `/parent/[studentId]` | Résumé | Moyenne, assiduité, reste à payer, dernières notes, dernières présences, dernières infos |
| `/parent/[studentId]/resultats` | Résultats | Notes publiées, regroupées par matière, avec la moyenne sur 20 |
| `/parent/[studentId]/vie-scolaire` | Vie scolaire | Présences/absences/retards, taux de présence, commentaires de l’école |
| `/parent/[studentId]/paiements` | Paiements | Frais, reste à payer, règlements, numéros de reçu et mode de règlement |
| `/parent/[studentId]/infos` | Infos | Annonces publiées et notifications personnelles |

L’identifiant de l’enfant est porté par l’URL : un partage, un rafraîchissement
ou un retour arrière ne peut pas melanger deux enfants. Les cinq onglets
conservent cet identifiant.

La navigation est un composant client (`ParentTabs`) qui déduit l’onglet actif
de l’URL (`usePathname`). Aucun état n’est échangé entre le serveur et le
client : le serveur reste la source de vérité.

## 2. Composition des fichiers

```text
src/app/(authenticated)/parent/
├── layout.tsx                     # coquille parent (AppShell)
├── page.tsx                       # sélecteur d'enfant
├── not-found.tsx                  # enfant non rattaché
└── [studentId]/
    ├── layout.tsx                 # sélecteur d'enfant, onglets, avis lecture seule
    ├── page.tsx                   # Résumé
    ├── loading.tsx                # squelette de chargement
    ├── error.tsx                  # état d'erreur + bouton « Réessayer »
    ├── not-found.tsx              # enfant non rattaché
    ├── resultats/page.tsx
    ├── vie-scolaire/page.tsx
    ├── paiements/page.tsx
    └── infos/page.tsx

src/modules/parent/
├── application/child-context.ts   # requireChildAccess : profil + enfants liés
├── data/                          # lectures Supabase authentifiées (RLS)
│   ├── children.supabase.ts
│   ├── child-grades.supabase.ts
│   ├── child-attendance.supabase.ts
│   ├── child-finance.supabase.ts
│   └── child-announcements.supabase.ts
├── domain/                        # règles pures, testées par Vitest
│   ├── children.ts, grades.ts, attendance.ts, finance.ts, announcements.ts, tabs.ts
└── ui/                            # ParentTabs, ChildSelector, EmptyState, StatCard
```

Le découpage respecte les règles de dépendances : `domain` ne dépend ni de
Supabase, ni de Next.js, ni de l’interface.

## 3. Règles de lecture

1. **Toutes les lectures passent par le client Supabase authentifié** (JWT de
   l’utilisateur, clé publique `anon`). Aucune clé de service, aucun contournement
   de la RLS.
2. **La RLS décide** de ce qu’un parent voit : notes publiées de ses enfants
   liés, présences, frais, paiements, annonces publiées qui le concernent.
3. **Le contrôle d’accès applicatif** (`requireChildAccess`) refuse un enfant
   non rattaché et répond par une page « introuvable » : l’existence d’un élève
   non lié n’est jamais révélée.
4. **Défense en profondeur sur les brouillons** : la requête filtre
   `published_at is not null` et le domaine applique `filterPublishedGrades`.
   Une évolution de la politique RLS ne suffirait pas à exposer un brouillon.
5. **Aucune écriture** : l’interface ne rend aucun formulaire ni bouton
   d’action métier sur les cinq onglets. La base refuse par ailleurs toute
   `INSERT`/`UPDATE`/`DELETE` parent sur `grades`, `attendance`, `fees` et
   `payments` (politiques RLS et tests dédiés).

## 4. États d’affichage

| État | Rendu | Déclencheur |
| --- | --- | --- |
| Chargement | `loading.tsx` : squelette animé + message explicite | rendu serveur en cours |
| Erreur | `error.tsx` : message, indice réseau et bouton « Réessayer » | échec de lecture Supabase |
| Vide | `EmptyState` par onglet (message + explication) | enfant sans donnée sur cet onglet |
| Rempli | Cartes de statistiques et listes | données disponibles |
| Enfant non rattaché | `not-found.tsx` | identifiant d’enfant hors du compte |

Les textes vivent dans `src/messages/fr.json` (section `parent`) pour préparer
l’internationalisation.

## 5. Formatage

- **La moyenne générale est une note sur 20**, selon le système scolaire
  français : elle est affichée « Moyenne générale » et valorisée `14,5 / 20`.
  Les moyennes par matière sont, elles, libellées « Moyenne ».
  Ce n’est ni un pourcentage, ni une moyenne sur 100.
  - Chaque note est ramenée sur 20 avant calcul : une évaluation sur 10
    (`8/10`) ou sur 50 (`45/50`) devient `16/20` et `18/20`, ce qui rend les
    moyennes comparables entre barèmes différents.
  - La moyenne est une moyenne arithmétique : aucun coefficient n’existe en
    V1, toutes les évaluations ont le même poids.
  - Le calcul est porté par `convertNoteToOutOfTwenty` et
    `computeAverageOnTwenty` (`src/modules/parent/domain/grades.ts`), avec un
    arrondi à une décimale.
- Les montants utilisent la devise de l’école (`schools.currency_code`) et le
  nombre de décimales de cette devise (`XAF` → 0, `EUR` → 2).
- Les dates civiles sont interprétées en UTC afin d’éviter un décalage d’un
  jour selon le fuseau du navigateur.
- Les durées sont calculées à partir de la date du jour pour le reste à payer.

## 6. Tests

| Niveau | Fichier | Couverture |
| --- | --- | --- |
| Unité | `src/modules/parent/domain/*.test.ts` | mapping strict des lignes, conversion des notes sur 20, moyennes sur 20, regroupement par matière, synthèse des présences, application des règlements, filtrage des brouillons, segments d’URL |
| Unité | `src/shared/format/format.test.ts` | formatage monétaire selon la devise, formatage des dates |
| RLS (PGlite) | `supabase/tests/parent-space.test.mjs` | isolation multi-enfants, absence de brouillon, filtrage annonces/notifications, refus d’écriture et de suppression, révocation d’un lien |
| RLS (PGlite) | `supabase/tests/rls.test.mjs` | non-régression des politiques existantes |
| RLS (PGlite) | `supabase/tests/supervision.test.mjs` | non-régression de l’isolation des rôles (voir `docs/SUPERVISION.md`) |
| E2E (Playwright) | `tests/e2e/parent-space.spec.mjs` | connexion, navigation entre les cinq onglets, URL liée à l’enfant, refus d’un enfant non rattaché, absence de fuite inter-enfants, absence de contrôle d’écriture, état d’erreur et reprise, audit responsive 320→1440 px sur les cinq onglets |

### Serveur Supabase de test

`tests/e2e/mock-supabase.mjs` implémente le strict nécessaire de l’API
Supabase (authentification par mot de passe, lecture de l’utilisateur, requêtes
PostgREST avec `select` imbriqué, filtres `eq.`, `not.is.null`, `order`,
`limit`). Il sert à exercer l’espace parent connecté sans dépendre du projet
hébergé, dont l’accès réseau est restreint depuis l’environnement de test.

Toutes les données y sont fictives. Le serveur laisse volontairement passer une
note en brouillon pour l’enfant lié : l’interface doit filtrer les brouillons
elle-même, et pas seulement s’appuyer sur la RLS.

## 7. Vérifications effectuées

```bash
npm run lint        # ESLint, aucune erreur ni avertissement
npm run typecheck   # TypeScript strict
npm run test:unit   # 106 tests
npm run test:db     # 47 tests RLS (PGlite + migrations réelles)
npm run test:e2e    # 74 tests Playwright
npm run build       # build de production
```

L’audit responsive vérifie, pour les cinq onglets et de 320 px à 1440 px :
aucun débordement horizontal, aucune cible interactive sous 44 px de hauteur et
aucun champ de saisie sous 16 px.

## 8. Limites connues

- Les données ne sont pas mises en cache hors ligne : le service worker de
  l’étape 4 ne sert que le shell public. Une consultation hors connexion n’est
  pas annoncée par l’application.
- Le compteur de notifications non lues n’est pas encore exposé dans la
  navigation ; il fait partie du centre de notifications de l’étape 7.
- Les received/paiements affichent le mode de règlement et le numéro de reçu,
  mais aucun reçu téléchargeable (exclu de la V1).
- La moyenne générale ne pondère pas les évaluations : aucun coefficient
  n’est saisi par l’école en V1.
