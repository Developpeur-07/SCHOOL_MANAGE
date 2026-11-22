import { chromium } from '@playwright/test';
import { getChromiumLaunchOptions } from './chromium.mjs';

/**
 * Contrôle du contraste des textes rendus.
 *
 * Le contraste est calculé sur le rendu réel, à partir des couleurs
 * effectivement appliquées et du fond effectivement derrière chaque texte.
 * Les éléments décoratifs — masqués aux lecteurs d'écran via `aria-hidden` —
 * sont exclus : ils ne portent aucune information, et le contraste ne s'y
 * applique pas.
 *
 * Seuil retenu : WCAG 2.1 niveau AA, 4,5:1 pour le texte normal, 3:1 pour
 * le texte en grand corps (au moins 24 px, ou 18,66 px en gras).
 *
 * Usage : `node scripts/contraste.mjs <url-base>`
 */

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100';

/** Pages publiques contrôlées. */
const PAGES_PUBLIQUES = [
  ['/', 'accueil'],
  ['/connexion', 'connexion'],
  ['/confidentialite', 'confidentialite'],
  ['/conditions', 'conditions'],
  ['/hors-ligne', 'hors-ligne'],
  ['/une-page-inexistante', '404'],
];

/** Pages de l'espace parent, contrôlées après connexion. */
const ESPACE_PARENT = [
  ['/parent', 'parent-enfants'],
  ['/parent/11000000-0000-4000-8000-000000000001', 'parent-resume'],
  ['/parent/11000000-0000-4000-8000-000000000001/resultats', 'parent-resultats'],
  ['/parent/11000000-0000-4000-8000-000000000001/vie-scolaire', 'parent-vie-scolaire'],
  ['/parent/11000000-0000-4000-8000-000000000001/paiements', 'parent-paiements'],
  ['/parent/11000000-0000-4000-8000-000000000001/infos', 'parent-infos'],
];

const AUDIT = () => {
  /**
   * Normalise une couleur CSS en canaux RVB.
   *
   * Le navigateur sérialise les couleurs calculées dans différents formats
   * selon leur origine — `rgb()`, `lab()`, `color(srgb …)`. Un canevas
   * accepte tous ces formats et restitue toujours les mêmes canaux : c'est
   * donc la voie la plus fiable pour comparer deux couleurs.
   */
  const canevas = document.createElement('canvas');
  canevas.width = 1;
  canevas.height = 1;
  const contexte = canevas.getContext('2d', { willReadFrequently: true });

  function parse(couleur) {
    if (!couleur || couleur === 'transparent' || couleur === 'none') return null;

    // Une couleur invalide laisse la valeur précédente : le magenta sert
    // donc de témoin.
    contexte.fillStyle = '#ff00ff';
    contexte.fillStyle = couleur;
    if (contexte.fillStyle === '#ff00ff') return null;

    contexte.clearRect(0, 0, 1, 1);
    contexte.fillRect(0, 0, 1, 1);

    const donnees = contexte.getImageData(0, 0, 1, 1).data;
    return {
      rgb: [donnees[0], donnees[1], donnees[2]],
      alpha: donnees[3] / 255,
    };
  }

  function luminance(rgb) {
    const [r, g, b] = rgb.map((valeur) => {
      const s = valeur / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function surimposer(couche, arriere) {
    // Une couche est soit une couleur analysée, soit un fond opaque déjà
    // réduit à ses trois canaux.
    const rgb = Array.isArray(couche) ? couche : couche.rgb;
    const alpha = Array.isArray(couche) ? 1 : couche.alpha;
    return rgb.map((canal, index) => canal * alpha + arriere[index] * (1 - alpha));
  }

  function fondDe(element) {
    let noeud = element;
    const couches = [];

    while (noeud && noeud !== document.documentElement) {
      const couleur = parse(getComputedStyle(noeud).backgroundColor);
      if (couleur && couleur.alpha > 0) {
        // L'alpha est conservé : un fond semi-transparent laisse voir ce
        // qui se trouve dessous, et le contraste se calcule sur la
        // composition réelle.
        couches.push(couleur);
        if (couleur.alpha === 1) break;
      }
      noeud = noeud.parentElement;
    }

    couches.push({ rgb: [255, 255, 255], alpha: 1 });

    let fond = [255, 255, 255];
    while (couches.length > 0) fond = surimposer(couches.pop(), fond);
    return fond;
  }

  const problemes = [];
  const elements = document.querySelectorAll('body *');

  for (const element of elements) {
    const texte = Array.from(element.childNodes)
      .filter((noeud) => noeud.nodeType === 3)
      .map((noeud) => noeud.textContent.trim())
      .join('');

    if (!texte) continue;
    if (element.closest('[aria-hidden="true"]')) continue;

    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    if (parseFloat(style.opacity) < 0.1) continue;

    const avant = parse(style.color);
    if (!avant) continue;

    const fond = fondDe(element);
    const couleur = surimposer(avant, fond);
    const l1 = luminance(couleur);
    const l2 = luminance(fond);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const taille = parseFloat(style.fontSize);
    const gras = parseInt(style.fontWeight, 10) >= 700;
    const grand = taille >= 24 || (taille >= 18.66 && gras);
    const seuil = grand ? 3 : 4.5;

    if (ratio < seuil) {
      problemes.push({
        texte: texte.slice(0, 50),
        ratio: Number(ratio.toFixed(2)),
        seuil,
        couleur: style.color,
        classe: element.className?.toString?.().slice(0, 80) ?? '',
        taille,
      });
    }
  }

  return problemes;
};

const navigateur = await chromium.launch(await getChromiumLaunchOptions());
const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
const page = await contexte.newPage();

let total = 0;

function rapporter(nom, problemes) {
  total += problemes.length;
  console.log(`${problemes.length === 0 ? 'OK  ' : 'ÉCHEC'} ${nom.padEnd(24)} ${problemes.length} problème(s)`);
  for (const probleme of problemes.slice(0, 6)) {
    console.log(`       « ${probleme.texte} » ratio ${probleme.ratio} < ${probleme.seuil} (${probleme.couleur}, ${probleme.taille}px)`);
    console.log(`       ${probleme.classe}`);
  }
}

for (const [chemin, nom] of PAGES_PUBLIQUES) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle' });
  rapporter(nom, await page.evaluate(AUDIT));
}

// Espace parent : la connexion passe par le serveur, il faut donc respecter
// le délai minimal de saisie appliqué par la protection anti-spam.
await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
await page.getByLabel('Adresse e-mail').fill('parent.demo@example.invalid');
await page.getByLabel('Mot de passe').fill('SchoolDemo2026!Parent');
await page.getByRole('button', { name: 'Se connecter' }).click();
await page.waitForURL(/\/(compte|parent)/, { timeout: 20_000 }).catch(() => undefined);

for (const [chemin, nom] of ESPACE_PARENT) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle' });
  rapporter(nom, await page.evaluate(AUDIT));
}

console.log(`\nTOTAL : ${total} problème(s) de contraste`);

await contexte.close();
await navigateur.close();

process.exit(total === 0 ? 0 : 1);
