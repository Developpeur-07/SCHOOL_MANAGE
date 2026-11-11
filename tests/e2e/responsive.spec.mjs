import { test, expect } from '@playwright/test';
import { mesurer, verifierMiseEnPage } from './mesures.mjs';

/**
 * Matrice responsive : de 320 px (petit téléphone) à 1440 px (ordinateur).
 *
 * Contrôles appliqués à chaque largeur :
 * - aucun débordement horizontal ;
 * - aucune cible interactive interactive < 44 px de hauteur ;
 * - aucune police de saisie < 16 px (sinon iOS zoome au focus) ;
 * - la mise en page s'adapte réellement (colonnes) au passage mobile → desktop.
 */

const VIEWPORTS = [
  { name: '320 px', width: 320, height: 640, tactile: true },
  { name: '360 px', width: 360, height: 800, tactile: true },
  { name: '390 px', width: 390, height: 844, tactile: true },
  { name: '768 px', width: 768, height: 1024, tactile: true },
  { name: '1024 px', width: 1024, height: 768, tactile: false },
  { name: '1440 px', width: 1440, height: 900, tactile: false },
];

const PAGES = ['/', '/connexion', '/hors-ligne'];

for (const viewport of VIEWPORTS) {
  for (const chemin of PAGES) {
    test(`mise en page sans débordement ni cible trop petite à ${viewport.name} : ${chemin}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(chemin, { waitUntil: 'networkidle' });

      const mesures = await mesurer(page);
      expect(verifierMiseEnPage(mesures)).toEqual([]);
    });
  }
}

test('la mise en page s’adapte : contenu empilé sur mobile, deux colonnes sur grand écran', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const sections = page.locator('main > div > section');
  await expect(sections).toHaveCount(2);

  const cadres = async () =>
    sections.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          gauche: Math.round(rect.left),
          haut: Math.round(rect.top),
          bas: Math.round(rect.bottom),
        };
      }),
    );

  await page.setViewportSize({ width: 360, height: 800 });
  const [hautMobile, basMobile] = await cadres();
  expect(hautMobile.gauche).toBe(basMobile.gauche);
  expect(hautMobile.bas, 'sections empilées sur mobile').toBeLessThanOrEqual(basMobile.haut);

  await page.setViewportSize({ width: 1440, height: 900 });
  const [gauche, droite] = await cadres();
  expect(Math.abs(gauche.gauche - droite.gauche), 'sections côte à côte sur grand écran').toBeGreaterThan(
    100,
  );
  expect(gauche.haut, 'sections sur la même ligne').toBeLessThan(droite.bas);
  expect(droite.haut).toBeLessThan(gauche.bas);
});

test('le formulaire de connexion reste utilisable sur téléphone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/connexion', { waitUntil: 'networkidle' });

  const email = page.getByLabel('Adresse e-mail');
  const password = page.getByLabel('Mot de passe');
  const submit = page.getByRole('button', { name: 'Se connecter' });

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();

  for (const champ of [email, password, submit]) {
    const box = await champ.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.x ?? 0).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  }
});
