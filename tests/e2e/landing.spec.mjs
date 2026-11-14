import { test, expect } from '@playwright/test';
import { mesurer, verifierMiseEnPage } from './mesures.mjs';

/**
 * Étape 8 — accueil public animé.
 *
 * Ces tests vérifient le comportement réellement perceptible de l'accueil :
 * - le hero expose cinq scènes, une par onglet de l'espace parent ;
 * - la rotation avance d'une scène à la fois ;
 * - la pause suspend la rotation ;
 * - les indicateurs sont cliquables et navigables au clavier ;
 * - `prefers-reduced-motion` suspend la rotation automatique ;
 * - le panneau « Contacter le support » s'ouvre et reste cohérent ;
 * - le menu mobile s'ouvre, se referme et referme l'onglet.
 *
 * Aucune donnée réelle n'est utilisée : les maquettes du hero sont fictives.
 */

const HERO = '[aria-roledescription="carrousel"]';
const INDICATEUR = 'button[aria-label^="Voir la scène"]';

const sceneCourante = (page) =>
  page.evaluate(() => document.querySelector('button[aria-current="true"]')?.getAttribute('aria-label') ?? null);

test.describe('accueil public', () => {
  test('le hero expose les cinq scènes de l’espace parent', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator(HERO)).toBeVisible();
    await expect(page.locator(INDICATEUR)).toHaveCount(5);

    const libelles = await page.locator(INDICATEUR).evaluateAll((boutons) =>
      boutons.map((bouton) => bouton.getAttribute('aria-label')),
    );
    expect(libelles).toEqual([
      'Voir la scène Résumé',
      'Voir la scène Résultats',
      'Voir la scène Vie scolaire',
      'Voir la scène Paiements',
      'Voir la scène Infos',
    ]);
  });

  test('la rotation avance d’une scène à la fois', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // La rotation ne tourne que lorsque le hero est à l'écran : c'est le
    // comportement attendu pour économiser la batterie et le CPU.
    await page.locator(HERO).scrollIntoViewIfNeeded();
    await expect(page.locator(HERO)).toBeInViewport();

    const depart = await sceneCourante(page);
    expect(depart).toBe('Voir la scène Résumé');

    await page.waitForTimeout(5200);
    const suivant = await sceneCourante(page);
    expect(suivant).toBe('Voir la scène Résultats');
  });

  test('la pause suspend la rotation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await page.locator(HERO).scrollIntoViewIfNeeded();
    await expect(page.locator(HERO)).toBeInViewport();

    const pause = page.getByRole('button', { name: /Suspendre l’aperçu/ });
    await expect(pause).toBeVisible();
    await pause.click();

    await expect(page.getByRole('button', { name: /Reprendre l’aperçu/ })).toBeVisible();

    const figee = await sceneCourante(page);
    await page.waitForTimeout(5200);
    expect(await sceneCourante(page)).toBe(figee);
  });

  test('les indicateurs sont cliquables et accessibles au clavier', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: 'Voir la scène Paiements' }).click();
    await expect(page.locator('button[aria-current="true"]')).toHaveAttribute(
      'aria-label',
      'Voir la scène Paiements',
    );

    // Flèche droite : la scène suivante est sélectionnée et reçoit le focus.
    await page.locator(INDICATEUR).first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('button[aria-current="true"]')).toHaveAttribute(
      'aria-label',
      'Voir la scène Résultats',
    );
    await expect(page.getByRole('button', { name: 'Voir la scène Résultats' })).toBeFocused();
  });

  test('la réduction des animations suspend la rotation automatique', async ({ browser }) => {
    const contexte = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await contexte.newPage();

    await page.goto('/', { waitUntil: 'networkidle' });

    const depart = await sceneCourante(page);
    await page.waitForTimeout(5200);

    // La scène ne change pas seule, mais les indicateurs restent utilisables.
    expect(await sceneCourante(page)).toBe(depart);
    await page.getByRole('button', { name: 'Voir la scène Infos' }).click();
    await expect(page.locator('button[aria-current="true"]')).toHaveAttribute(
      'aria-label',
      'Voir la scène Infos',
    );

    await contexte.close();
  });

  test('le panneau support s’ouvre et propose une action réelle', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const action = page.getByRole('button', { name: 'Contacter le support' });
    await expect(action).toBeVisible();
    await expect(action).toHaveAttribute('aria-expanded', 'false');

    const panneau = page.locator('#support-panneau');
    await expect(panneau).toBeHidden();

    await action.click();
    await expect(action).toHaveAttribute('aria-expanded', 'true');
    await expect(panneau).toBeVisible();

    // L'action ne redirige vers aucune destination inventée : elle prépare un
    // message à transmettre à l'école, et renvoie vers les écrans existants.
    await expect(page.getByRole('button', { name: /Copier le message pour mon école/ })).toBeVisible();
    await expect(page.locator('#support-panneau pre')).toContainText('École');
    await expect(page.locator('section#support a[href="/connexion"]')).toBeVisible();
    await expect(page.locator('section#support a[href="/hors-ligne"]')).toBeVisible();
    // Aucune adresse e-mail ni lien externe inventé.
    await expect(page.locator('section#support a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('section#support a[href^="http"]')).toHaveCount(0);
  });

  test('le menu mobile s’ouvre, se referme et referme l’onglet', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const declencheur = page.getByRole('button', { name: /Ouvrir le menu/ });
    await expect(declencheur).toBeVisible();

    const menu = page.locator('#nav-mobile');
    await expect(menu).toBeHidden();

    await declencheur.click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link')).toHaveCount(5);

    await menu.getByRole('link', { name: 'Témoignage' }).click();
    await expect(menu).toBeHidden();
  });

  test('la page reste lisible et sans débordement sur téléphone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const mesures = await mesurer(page);
    expect(verifierMiseEnPage(mesures)).toEqual([]);
  });
});
