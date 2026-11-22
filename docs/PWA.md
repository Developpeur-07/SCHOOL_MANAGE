# PWA, hors ligne et performance — étape 4

> Périmètre : installation PWA, caches non sensibles, navigation hors ligne, affichage à 360 px et mesures Lighthouse.
> Cette étape n’ajoute ni onglets métier, ni notifications Web Push, ni hero animé.

## 1. Implémentation

| Fichier | Responsabilité |
| --- | --- |
| `public/manifest.webmanifest` | Installation standalone, langue, thème et icônes |
| `public/icons/` | PNG 192/512, maskable 512 et Apple 180 |
| `public/sw.js` | Précache public, cache des assets et fallback hors ligne |
| `src/shared/pwa/service-worker-registration.tsx` | Enregistrement uniquement en production |
| `src/app/hors-ligne/page.tsx` | Page publique de secours avec styles essentiels inline |
| `src/app/layout.tsx` | Manifeste, icônes, viewport et enregistrement |
| `next.config.ts` | En-têtes du manifeste et du service worker |
| `scripts/generate_pwa_icons.py` | Reproduction des icônes avec Python standard, sans dépendance |

Le service worker est enregistré à la racine uniquement en production. Le mode développement ne met aucun cache en place. Aucun verrouillage d’orientation n’est imposé.

## 2. Stratégies de cache et confidentialité

| Ressource | Stratégie | Conservation |
| --- | --- | --- |
| `/`, `/compte-desactive`, `/hors-ligne` | Précache puis network-first | Autorisée : pages publiques sans donnée utilisateur |

L'accueil public a été remplacé par une page de présentation animée à l'étape 8
(voir `docs/ACCUEIL-PUBLIC.md`). Elle reste entièrement publique, ne lit
aucune donnée Supabase et demeure servie depuis le précache hors connexion.
Son hero suspendu sa rotation lorsque l'onglet est masqué ou que la page
n'est plus à l'écran.
| `/_next/static/*`, icônes, manifeste | Cache-first, réseau au premier accès | Autorisée : assets publics |
| `/connexion` | Network-only, fallback `/hors-ligne` | Jamais |
| `/compte`, `/parent`, `/ecole`, `/enseignant` et autres pages | Network-only, fallback `/hors-ligne` | Jamais |
| Requêtes RSC (`RSC` ou `_rsc`) | Non interceptées | Jamais |
| `/api/*`, Supabase et autres origines | Non interceptées | Jamais |
| POST, PUT, PATCH, DELETE | Non interceptées | Jamais |

Les anciens caches `school-manage-*` sont supprimés à l’activation d’une nouvelle version. Aucun mécanisme de synchronisation en arrière-plan ou d’écriture hors ligne n’est présent. Les espaces authentifiés nécessitent donc une connexion : c’est un choix de confidentialité, pas une promesse de disponibilité hors ligne des données métier.

Workbox n’est pas ajouté : le faible nombre de stratégies est couvert par un service worker natif, testé directement.

## 3. Justification des outils de développement

Aucun navigateur n’était installé dans l’environnement de travail. Les outils suivants exécutent réellement les validations demandées :

- `@playwright/test` **1.65.0** : navigation réelle, viewport 360 px et simulation hors ligne ;
- `lighthouse` **13.6.0** : mesures Performance, Accessibilité, Bonnes pratiques et SEO ;
- `@sparticuz/chromium` **153.0.0** : binaire Chromium compressé sans navigateur système.

Ce sont des **devDependencies**, jamais importées par l’application et absentes du bundle Vercel. Chromium représente environ 70 MB décompressés dans `node_modules`, ignoré par Git. Le script `scripts/chromium.mjs` charge ses bibliothèques AL2023 dans `/tmp`, car le sandbox ne les initialise pas automatiquement. Le mode `--single-process`, instable dans ce sandbox, est désactivé uniquement pour les tests.

Les rapports Lighthouse et captures Playwright sont écrits dans `test-results/`, également ignoré par Git.

## 4. Vérifications exécutées

### Tests automatisés

- **40/40 tests unitaires Vitest**, dont 7 tests exécutant le vrai `public/sw.js` avec Cache Storage simulé ;
- **32/32 tests SQL/RLS** ;
- **6/6 tests Playwright Chromium** :
  - manifeste, trois icônes et en-têtes du worker ;
  - enregistrement effectif du service worker ;
  - accueil public disponible hors ligne ;
  - page protégée remplacée par le fallback hors ligne et absente des caches ;
  - `/`, `/connexion`, `/compte-desactive`, `/hors-ligne` à **360 × 800 px**, sans débordement horizontal ni cible visible de moins de 44 px ;
- lint et TypeScript strict : réussis ;
- build de production : réussi, `/hors-ligne` statique et routes protégées dynamiques ;
- `npm audit --audit-level=moderate` : **0 vulnérabilité**.

La capture de `/connexion` à 360 px a aussi été inspectée visuellement : textes non tronqués, champs et boutons utilisables.

### Lighthouse mobile — build de production

| Route | Performance | Accessibilité | Bonnes pratiques | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | **100** | **100** | **100** | **100** |
| `/connexion` | **99** | **100** | **100** | **100** |
| `/compte-desactive` | **99** | **100** | **100** | **100** |
| `/hors-ligne` | **100** | **100** | **100** | **100** |

Toutes les catégories mesurées dépassent donc **90/100**. Les catégories PWA historiques ne sont plus exposées par Lighthouse 13 ; l’installation est contrôlée séparément par le manifeste, les icônes et l’enregistrement réel du service worker dans Chromium.

## 5. Reproduction

Prérequis : **Node.js 22.19 ou supérieur**, aligné sur les outils Playwright/Lighthouse et Chromium.

```bash
npm run build
npm run start -- --port 3000
```

Dans un autre shell, sur la même machine :

```bash
npm run test:e2e
npm run test:lighthouse
```

Playwright peut démarrer le serveur de production s’il est absent. Lighthouse attend quant à lui un serveur déjà disponible sur `http://127.0.0.1:3000` ; `PREVIEW_URL` permet de viser une autre URL accessible depuis le sandbox.

## 6. Limites restantes

- Aucun appareil Android/iOS physique, Safari ou installation depuis le menu système n’a été testé.
- Lighthouse utilise une émulation mobile et un réseau simulé : ce n’est pas une mesure sur un téléphone réel en 2G/3G.
- Les routes authentifiées réelles ne sont pas mesurées par Lighthouse faute de compte Auth utilisable.
- Le fallback hors ligne ne rend pas les données métier disponibles et ne met aucune écriture en file d’attente.
- Web Push, le centre de notifications et les onglets parents restent respectivement aux étapes 7 et 5.
