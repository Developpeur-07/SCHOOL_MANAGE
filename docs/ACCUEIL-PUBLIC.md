# Accueil public animé (étape 8)

Ce document décrit l'accueil public livré à l'étape 8 : la page d'accueil
promue, son hero animé à cinq scènes, les sections de présentation, le
périmètre du bouton « Contacter le support » et les vérifications exécutées.

La page est **entièrement publique**. Elle ne lit aucune donnée Supabase,
ne dépend d'aucune session et reste servie depuis le cache du service worker,
y compris hors connexion.

---

## 1. Implémentation

| Fichier | Responsabilité |
| --- | --- |
| `src/app/page.tsx` | Composition de l'accueil : hero, bénéfices, usages, profils, témoignage, support, pied de page |
| `src/app/layout.tsx` | `metadataBase` : base des URL absolues (canonical, Open Graph) |
| `src/modules/public-home/domain/scenes.ts` | Ordre des scènes, rotation, indexation, association aux libellés |
| `src/modules/public-home/ui/hero-showcase.tsx` | Hero : rotation, pause, indicateurs, clavier, reduced motion |
| `src/modules/public-home/ui/scene-mockups.tsx` | Maquettes statiques des cinq écrans de l'espace parent |
| `src/modules/public-home/ui/public-nav.tsx` | Navigation publique et menu mobile |
| `src/modules/public-home/ui/profiles-section.tsx` | Section « Un écran adapté à chaque profil » |
| `src/modules/public-home/ui/support-panel.tsx` | Action « Contacter le support » |
| `src/shared/config/site.ts` | URL publique du site, lue dans l'environnement de build |
| `src/messages/fr.json` | Tous les textes publics, externalisés |

Les libellés des maquettes sont repris de `messages.parent.*` : la
présentation ne peut pas diverger des écrans réellement affichés après
connexion. « Moyenne générale » désigne l'indicateur global, « Moyenne » la
moyenne d'une matière.

## 2. Le hero : cinq scènes

Les cinq scènes correspondent aux cinq onglets réels de l'espace parent :
Résumé, Résultats, Vie scolaire, Paiements, Infos. L'ordre est défini par
`SCENE_IDS` dans le domaine, pas par l'ordre du fichier de traduction :
`getPublicScenes` réassocie les libellés aux identifiants et signale toute
scène manquante.

Les maquettes sont des compositions HTML et CSS, sans capture d'écran ni
image : elles restent nettes à toutes les densités, ne pèsent rien et
n'introduisent aucune donnée réelle. La mention « Aperçu illustratif : les
données affichées sont fictives » est affichée sous le hero.

### Rotation et contrôles

| Contrôle | Comportement |
| --- | --- |
| Rotation automatique | 4 500 ms par scène, dans la fenêtre 4–5 s exigée |
| Pause explicite | Bouton `Suspendre` / `Reprendre l'aperçu`, avec `aria-pressed` |
| Pause au survol | La rotation se suspend dès que le pointeur entre dans le hero |
| Pause au focus | Idem dès que le focus entre dans le hero, puis reprend à la sortie |
| Hors écran | `IntersectionObserver` : la rotation s'arrête hors du viewport |
| Onglet masqué | `visibilitychange` : la rotation s'arrête si l'onglet passe en arrière-plan |
| Indicateurs | Cinq boutons, un par scène, avec `aria-current` sur la scène active |
| Clavier | `←`, `→`, `Home`, `End` déplacent la scène depuis l'indicateur focalisé |
| Annonce | Zone `aria-live="polite"` indiquant « Scène N sur 5 : Titre » |

Le carrousel est un `role="group"` avec `aria-roledescription="carrousel"`.

### Accessibilité du mouvement

- Les animations sont limitées à `transform` et `opacity` : translation
  verticale de 12 px et fondu. Aucune propriété de mise en page n'est
  animée, donc aucune reflow pendant la rotation.
- `prefers-reduced-motion` est respecté via `useReducedMotion()` de Motion :
  la rotation automatique est suspendue, les transitions sont instantanées et
  le décalage vertical est supprimé. Les indicateurs restent utilisables, ce
  qui laisse au visiteur le contrôle du contenu.
- Le rendu global du CSS neutralise déjà les animations en
  `prefers-reduced-motion: reduce` (`src/styles/globals.css`).
- Motion est chargé via `LazyMotion` avec le seul bundle `domAnimation` :
  les fonctions de mise en page et de glisser-déposer ne sont pas
  embarquées.

Le premier rendu est servi par le serveur : sans JavaScript, la première
scène reste lisible et le reste du contenu de la page est complet.

## 3. Sections de la page

| Section | Ancre | Rôle |
| --- | --- | --- |
| Hero | — | Proposition de valeur, CTA « Se connecter », aperçu animé, points de réassurance |
| Bénéfices | `#avantages` | Quatre bénéfices concrets : cohérence de l'information, lecture seule, isolation stricte, continuité hors connexion |
| Usages | `#usages` | Trois surfaces : espace parent, supervision multi-écoles, écran hors connexion |
| Profils | `#profils` | « Un écran adapté à chaque profil » : bénéfice concret par poste de travail |
| Témoignage | `#temoignage` | Verbatim illustratif, explicitement identifié comme tel |
| Support | `#support` | Description et action « Contacter le support » |

La section « Un écran adapté à chaque profil » est une section de bénéfices
et non une fiche technique : chaque entrée décrit ce que le profil gagne sur
son poste (parents au pouce sur téléphone et tablette, école à la souris sur
ordinateur). Le portail école étant encore en ouverture progressive, son
statut est affiché honnêtement (« Ouverture progressive »).

Le témoignage est marqué « Témoignage illustratif, en attente d'un retour
client vérifié » : aucun avis n'est attribué à une personne réelle.

## 4. « Contacter le support » : une action adaptée

**Aucun canal de support réel n'existe en production** : ni adresse e-mail,
ni numéro de téléphone, ni formulaire distant, ni page de contact. Inventer
une destination aurait produit un bouton qui ne mène nulle part.

L'action est donc adaptée et réellement utilisable :

1. le bouton ouvre un panneau « Comment obtenir de l'aide » (avec
   `aria-expanded` et `aria-controls`) ;
2. le panneau distingue trois cas — identifiants et rattachement, données de
   l'école, incident technique — et oriente vers l'administration de l'école,
   qui tient les comptes, les liens familiaux et les publications ;
3. un bouton « Copier le message pour mon école » place un modèle de message
   dans le presse-papiers, avec confirmation et repli explicite en cas
   d'échec. La copie est locale : rien n'est transmis ;
4. deux liens vers des écrans existants : la connexion et l'écran hors ligne.

Le test E2E vérifie explicitement l'absence de `mailto:` et de tout lien
externe dans la section.

## 5. Navigation et métadonnées

La navigation publique est un en-tête collant : liens de rubriques sur
grand écran, bouton unique qui déploie un menu sur téléphone. Le menu se
referme à la navigation, à la touche Échap, et rend le focus au bouton
déclencheur.

L'URL canonique n'est annoncée que si l'adresse publique du site est connue
(`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` ou `NEXT_PUBLIC_SITE_URL`).
En développement, aucune `canonical` n'est émise : annoncer `localhost`
comme adresse de référence serait faux. Aucun domaine n'est codé en dur dans
l'application.

## 6. Vérifications exécutées

### Tests automatisés

- **129 tests unitaires Vitest**, dont 13 sur le domaine des scènes
  (rotation, bouclage, indexation, ordre) et 8 sur l'URL publique du site ;
- **47 tests SQL/RLS** ;
- **83 tests Playwright Chromium**, dont une nouvelle suite
  `tests/e2e/landing.spec.mjs` (8 tests) :
  - cinq scènes exposées, dans l'ordre des onglets ;
  - la rotation avance d'une scène ;
  - la pause suspend bien la rotation ;
  - les indicateurs sont cliquables et navigables au clavier ;
  - `prefers-reduced-motion` suspend la rotation automatique ;
  - le panneau support s'ouvre et ne contient aucun `mailto:` ni lien externe ;
  - le menu mobile s'ouvre et se referme ;
  - aucun débordement ni cible trop petite à 360 px ;
- lint et TypeScript strict : réussis ;
- build de production : réussi, `/` toujours prérendue en statique.

### Lighthouse — build de production, mobile simulé (360 × 800)

| Route | Performance | Accessibilité | Bonnes pratiques | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | **96** | **100** | **100** | **100** |
| `/connexion` | **99** | **100** | **100** | **100** |
| `/compte-desactive` | **99** | **100** | **100** | **100** |
| `/hors-ligne` | **100** | **100** | **100** | **100** |

Toutes les catégories mesurées dépassent **90/100**. Les catégories PWA
historiques ne sont plus exposées par Lighthouse 13 ; l'installation reste
contrôlée séparément par le manifeste, les icônes et l'enregistrement réel du
service worker.

## 7. Limites restantes

- Les maquettes du hero sont des compositions statiques : elles ne
  reflètent pas les données réelles d'un élève, et ne sont pas générées à
  partir d'un compte de démonstration.
- Le témoignage est illustratif : aucun retour client vérifié n'a encore
  été recueilli.
- Le « Copier le message pour mon école » dépend de l'API presse-papiers du
  navigateur. Sur un contexte non sécurisé ou sans autorisation, un message
  d'échec explicite est affiché et le modèle reste visible pour une copie
  manuelle.
- Aucun canal de support distant n'existe : l'action prépare un message, elle
  ne l'envoie pas.
- Le portail de l'école et l'espace enseignant restent des écrans de
  préparation : la page d'accueil le signale explicitement.
- Les scores Lighthouse sont mesurés sur une émulation mobile et un réseau
  simulé : ce n'est pas une mesure sur un téléphone réel.
