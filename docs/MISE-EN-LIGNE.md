# Mise en conformité avant mise en ligne — SCHOOL_MANAGE

Ce document décrit l'audit des vingt points demandé avant toute mise en
ligne : ce qui a été constaté, ce qui a été corrigé dans le code, et ce qui
reste à faire avant d'ouvrir l'accès au public.

Date de l'audit : **7 novembre 2026**.
Version auditée : branche `arena/a2c74eab-school-manage`.

---

## 1. Méthode

L'audit n'a pas été mené sur une liste de contrôles théorique mais sur le
code réel et sur le rendu réel :

- ** lecture des sources** pour tout ce qui est statique : secrets exposés,
  liens, textes alternatifs, métadonnées, appels à l'action ;
- ** rendu mesuré** pour tout ce qui dépend du navigateur : contraste
  calculé sur les couleurs effectivement appliquées, cibles tactiles,
  débordements ;
- ** tests automatisés** ajoutés à chaque correction, pour qu'elle ne se
  perde pas.

Trois outils ont été ajoutés ou complétés à cette occasion :

| Outil | Rôle |
| --- | --- |
| `scripts/contraste.mjs` | calcule le contraste WCAG AA sur le rendu réel, page publique et espace connecté |
| `scripts/generate-brand-assets.mjs` | produit le favicon et l'image d'aperçu social depuis le logo |
| `tests/e2e/conformite.spec.mjs` | vérifie les vingt points côté navigateur |

---

## 2. Les vingt points, point par point

### 1. Politique de confidentialité — **corrigé**

La page n'existait pas. Elle est disponible sur `/confidentialite`, servie
par `src/modules/legal/ui/legal-page-view.tsx`, alimentée par
`src/modules/legal/domain/legal-content.ts`.

Le contenu décrit le comportement observable du logiciel : ce qui est
conservé, qui accède à quoi, la durée de conservation, le journal d'audit,
le cookie de session et la mesure d’audience. Il ne décrit aucun canal de
support qui n’existe pas, et ne mentionne aucune adresse inventée.

### 2. Conditions générales d’utilisation — **corrigé**

Page `/conditions`, même gabarit, sections distinctes : objet, accès, usage
autorisé, responsabilités, propriété intellectuelle, données personnelles,
évolution du service.

### 3. Aucun secret exposé au front — **vérifié et durci**

`src/shared/config/env.ts` ne contenait plus que la configuration publique.
La configuration serveur (`SUPABASE_INTERNAL_URL`) a été déplacée dans
`src/shared/config/env-server.ts`, que le client n’importe jamais.

Le test `src/shared/quality/secrets.test.ts` vérifie, sur les sources
effectives :

- aucune clé de service (`sb_secret_`) hors du garde-fou de refus ;
- aucun rôle `service_role` dans le code applicatif ;
- aucun module lisant une variable serveur atteignable depuis un composant
  client (fermeture transitive des imports).

### 4. HTTPS forcé — **corrigé**

La redirection est réalisée par le proxy (`src/proxy.ts`), et non par la
configuration : celle-ci ne peut pas conserver l’hôte réellement demandé.

La redirection ne se déclenche que si les trois conditions sont réunies :

- le proxy annonce `x-forwarded-proto: http` ;
- l’hôte demandé appartient au domaine public connu ;
- l’hôte n’est pas local.

Sans ces conditions, le développement, les tests et la prévisualisation
locale — qui ne disposent pas d’HTTPS — deviendraient inaccessibles. Aucun
hôte tiers ne peut détourner la redirection : l’hôte est validé avant
construction de l’URL.

`Strict-Transport-Security: max-age=63072000; includeSubDomains` est
ajouté à toutes les réponses.

### 5. Bandeau de consentement cookies — **corrigé**

`src/modules/privacy/ui/consent-banner.tsx`. Le bandeau propose deux
décisions explicites : accepter ou refuser la mesure d’audience, avec un
détail dépliable.

Il est posé par-dessus la page et l’espace qu’il occupe est **réservé** sur
le document : aucun contenu n’est masqué — le bouton de connexion restait
autrefois sous le bandeau. Cette réservation ne déplace aucun élément
visible : le décalage de mise en page (CLS) reste à 0.

### 6. Titres et descriptions méta — **corrigé**

- le titre de l’accueil ne portait pas le nom de l’application : le modèle de
  titre du layout racine ne s’applique pas au segment racine. Le nom est
  désormais ajouté explicitement ;
- toutes les pages disposent d’un titre et d’une description ;
- les URL canoniques ne sont annoncées que si l’adresse publique du site est
  connue (`canonicalPath`).

### 7. Image d’aperçu pour les réseaux sociaux — **corrigé**

`public/og-image.png`, 1200 × 630, produite par
`scripts/generate-brand-assets.mjs` à partir du logo. Elle est déclarée pour
Open Graph et pour Twitter (`summary_large_image`).

Les métadonnées sont fusionnées champ par champ : une page qui redéfinit
`openGraph` remplace entièrement celui du layout. L’image est donc reprise
explicitement sur chaque page qui redéfinit ses métadonnées, via la
constante partagée `OPEN_GRAPH_IMAGE`.

### 8. Favicon — **corrigé**

`src/app/favicon.ico`, multi-tailles (16, 32, 48 px), produit par le même
script. Les icônes de la plateforme (192, 512, masque) sont conservées et
redéclarées.

### 9. Sitemap et `robots.txt` — **corrigé**

- `src/app/sitemap.ts` : seules les pages publiques y figurent. Hors
  production, le plan est vide plutôt que d’annoncer `localhost`.
- `src/app/robots.ts` : les espaces authentifiés et les points d’entrée
  techniques sont exclus.

Une difficulté tient à `/compte`. Le protocole d’exclusion raisonne par
préfixe : `Disallow: /compte` interdisait donc aussi `/compte-desactive`,
page d’information sans donnée personnelle, que les moteurs déclaraient
non indexable. La page technique est désormais autorisée explicitement
(`Allow: /compte-desactive`) : la règle la plus longue l’emporte, et
`/compte` reste interdit. Le comportement est vérifié par le même
analyseur que celui de Lighthouse, et par un test de bout en bout.

### 10. Textes alternatifs des images — **vérifié**

Le site n’utilise aucune balise `img` : tous les visuels sont des icônes
vectorielles `aria-hidden` ou des composants dessinés en CSS. Le test
`src/shared/quality/conformite.test.ts` verrouille ce point, et vérifie que
toute image éventuelle porterait un attribut `alt`.

L’image d’aperçu sociale porte une description, déclarée dans ses
métadonnées.

### 11. Compression des images — **corrigé**

`images.formats` sert l’AVIF puis le WebP. La compression des réponses HTTP
est explicite. Les icônes de la plateforme pèsent moins de 3 Ko ; l’image
d’aperçu sociale, 70 Ko, n’est jamais téléchargée par un visiteur, seulement
par un robot de partage.

### 12. Vitesse de chargement — **corrigé**

Trois causes ont été traitées.

**Le bandeau de consentement.** Inséré après l’hydratation, il décalait
toute la page : le score de performance de l’accueil était tombé à 74. Il
est désormais posé par-dessus la page, et l’espace qu’il occupe est
**réservé** sur le document. Le décalage de mise en page (CLS) est de **0**.

**La bibliothèque d’animation.** Le hero de l’accueil utilisait une
bibliothèque d’animation JavaScript pour le fondu entre deux scènes. Elle
représentait 48 Ko de JavaScript téléchargé, sur le chemin critique du
rendu. Elle a été retirée : la transition est désormais une animation CSS,
rendue par le navigateur sans script à télécharger. Le poids de JavaScript
de l’accueil est passé de 199 Ko à 155 Ko, et son plus grand contenu
visible de 2,8 s à 1,0 s.

**Le nombre de composants hydratés.** Les animations de l’accueil ne
demandent plus de script : seule la rotation — un simple changement
d’état — reste en JavaScript.

Scores obtenus sur un build de production, en simulation mobile 360 × 800,
sur deux mesures consécutives :

| Page | Performance | Accessibilité | Bonnes pratiques | SEO |
| --- | --- | --- | --- | --- |
| `/` | 98 | 100 | 100 | 100 |
| `/connexion` | 92 – 95 | 100 | 100 | 100 |
| `/compte-desactive` | 95 – 96 | 100 | 100 | 100 |
| `/hors-ligne` | 96 – 97 | 100 | 100 | 100 |

### 13. Contraste des couleurs — **corrigé**

L’audit a porté sur les paires réellement utilisées. `text-slate-500`
(3,80:1) et `text-slate-400` (2,05:1) ont été remplacés par
`text-slate-600` (6,05:1). Les occurrences restantes de `text-slate-400` et
`text-teal-700` décorent des icônes `aria-hidden`, qui ne portent pas
d’information : le contraste ne s’y applique pas.

`scripts/contraste.mjs` contrôle désormais le rendu réel — couleurs
effectives, fonds superposés, alpha conservé — sur six pages publiques et
six pages de l’espace parent. Résultat : **0 problème**.

### 14. Adaptation mobile — **déjà conforme, vérifié**

Les tests existants couvrent 320, 360, 390, 768, 1024 et 1440 px, sans
débordement ni cible inférieure à 44 px.

### 15. Page 404 personnalisée — **déjà conforme**

`src/app/not-found.tsx` est un écran dédié, avec issue vers l’espace
connecté.

### 16. Absence de liens cassés — **corrigé**

`src/app/hors-ligne/page.tsx` utilisait `href=""` pour « Réessayer » : un
lien vide qui rechargeait la page courante. L’action est devenue un bouton
qui recharge réellement la page demandée
(`src/app/hors-ligne/retry-button.tsx`).

Le test E2E parcourt tous les liens internes des pages publiques et
vérifie qu’aucun ne renvoie une erreur.

### 17. Validation des formulaires — **corrigé**

Le formulaire de connexion valide maintenant chaque champ, avec un message
en français, un `aria-invalid`, un `aria-describedby` et le focus porté sur
le champ fautif. La validation native du navigateur a été désactivée : ses
bulles ne sont ni traduisibles, ni annoncées, ni associables au champ.

### 18. Protection anti-spam — **corrigé**

Trois barrières :

1. **champ piège** hors écran, hors tabulation et hors autocomplétion ;
2. **délai minimal de saisie** de 1,2 s après l’ouverture du formulaire ;
3. **limitation des tentatives** côté serveur, dans
   `src/modules/auth/domain/login-rate-limit.ts`.

La limitation compte les **échecs**, jamais les succès : un utilisateur
légitime qui se connecte souvent n’est pas bloqué. Deux compartiments sont
suivis séparément, l’adresse d’origine et le compte visé ; ils sont stockés
sous forme d’empreinte SHA-256, jamais en clair.

La connexion passe désormais par `POST /api/auth/login` : la session est
créée côté serveur et les échecs sont comptés là où un compteur côté
navigateur serait effaçable d’un simple rechargement.

### 19. Outil de mesure d’audience — **corrigé**

Mesure **de première partie**, sans tiers, et **facultative** :

- rien n’est mesuré tant que le consentement n’est pas donné — le
  contrôle est fait par le client avant tout appel réseau, et le test E2E
  le vérifie en comptant les requêtes ;
- le retrait du consentement arrête immédiatement toute nouvelle mesure, et
  reste possible à tout moment ;
- seules les pages publiques listées sont mesurées : aucun parcours
  connecté n’est suivi ;
- le serveur ne reçoit que le chemin de la page et ne conserve qu’un
  compteur agrégé par jour et par chemin (`public.audience_daily`), sans
  identifiant, sans adresse IP, sans donnée personnelle.

L’écriture passe par une fonction sécurisée (`public.register_audience_visit`)
qui applique elle-même sa liste blanche. Le rôle anonyme n’a aucun droit
direct sur la table : les compteurs ne peuvent pas être faussés depuis le
navigateur.

### 20. Appel à l’action unique et clair — **corrigé**

L’accueil présentait quatre accès à la connexion concurrents : l’en-tête, le
hero, le panneau support et le pied de page.

Il n’existe désormais qu’**un seul appel à l’action principal**, marqué
`data-cta="principal"` : le bouton « Se connecter » du hero. Les autres
occurrences sont en second plan — contour dans l’en-tête, lien simple dans
le pied de page — et le panneau support ne répète plus l’accès à la
connexion.

Le test E2E vérifie qu’il n’existe qu’un seul élément marqué, et qu’il
porte le bon libellé.

---

## 3. En-têtes de sécurité ajoutés

Appliqués à toutes les réponses (`next.config.ts`) :

| En-tête | Valeur | Rôle |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | impose le HTTPS |
| `X-Content-Type-Options` | `nosniff` | interdit de reinterpréter un type MIME |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ne transmet que l’origine |
| `X-Frame-Options` | `DENY` | interdit l’inclusion dans un cadre tiers |
| `Permissions-Policy` | caméra, micro, géolocalisation, paiement et USB désactivés | réduit la surface du navigateur |
| `Cross-Origin-Opener-Policy` | `same-origin` | isole la fenêtre des autres origines |

---

## 4. Ce qui reste à faire avant l’ouverture au public

Ces points ne sont pas des corrections de code : ce sont des opérations et
des décisions qui appartiennent au responsable du déploiement.

1. **Appliquer la migration de mesure d’audience.**
   `supabase/migrations/20261112000001_audience_measurement.sql` crée la
   table et la fonction. Tant qu’elle n’est pas appliquée, la mesure reste
   inactive — sans erreur visible, et c’est le comportement attendu.

2. **Définir l’adresse publique du site.** `NEXT_PUBLIC_SITE_URL` doit
   désigner l’adresse définitive. Sans elle, aucune URL canonique n’est
   annoncée et le plan du site reste vide. C’est aussi cette variable qui
   autorise la redirection vers HTTPS.

3. **Vérifier l’adresse de production.** L’alias de production et
   l’environnement de prévisualisation ne doivent pas pointer sur des
   données réelles tant que la mise en ligne n’est pas décidée.

4. **Confirmer le contenu des pages légales.** Les textes décrivent le
   comportement du logiciel tel qu’il est aujourd’hui. Si l’exploitation
   réelle diffère — sous-traitance d’hébergement, durée de conservation
   propre à l’établissement — les textes doivent être ajustés avant
   publication. Une politique qui ne reflète pas la réalité est pire
   qu’une politique absente.

5. **Décider qui répond.** Les pages légales renvoient vers l’établissement
   qui a remis les accès, jamais vers un canal inventé. Si un canal de
   support doit exister, il doit être réel et remplacé dans les textes.

6. **Valider les comptes de démonstration.** Les six comptes de
   démonstration sont acquis. Leur présence en production doit être une
   décision explicite : ce sont des accès connus, donc des accès que
   quiconque pourrait tenter.

---

## 5. Validation exécutée

| Contrôle | Résultat |
| --- | --- |
| `npm run lint` | sans avertissement |
| `npm run typecheck` | sans erreur |
| `npm run build` | réussi |
| `npm run test:unit` | **183 / 183** |
| `npm run test:db` | **56 / 56** |
| `npx playwright test` | **105 / 105** |
| `npm run test:lighthouse` | 92 – 98 / 100 / 100 / 100 |
| `node scripts/contraste.mjs` | 0 problème sur 12 pages |

Les tests ajoutés pour cette mise en conformité :

- `src/modules/privacy/domain/consent.test.ts` — règles de consentement ;
- `src/modules/auth/domain/login-attempt.test.ts` — champ piège et délai ;
- `src/modules/auth/domain/login-rate-limit.test.ts` — limitation des
  tentatives ;
- `src/shared/quality/secrets.test.ts` — absence de secret exposé ;
- `src/shared/quality/conformite.test.ts` — liens, images, appel à l’action
  unique, pages légales, métadonnées ;
- `supabase/tests/audience.test.mjs` — mesure d’audience, cloisonnement et
  absence de donnée personnelle ;
- `tests/e2e/conformite.spec.mjs` — vingt points vérifiés dans le navigateur.
