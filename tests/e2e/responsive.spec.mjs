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

test('la mise en page s’adapte : hero empilé sur mobile, deux colonnes sur grand écran', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Le hero oppose le texte de présentation à l'aperçu animé de l'espace parent.
  const titre = page.locator('#hero-titre');
  const apercu = page.locator('[aria-roledescription="carrousel"]');
  await expect(titre).toBeVisible();
  await expect(apercu).toBeVisible();

  const cadres = async () => {
    const gauche = await titre.boundingBox();
    const droite = await apercu.boundingBox();
    return { gauche, droite };
  };

  await page.setViewportSize({ width: 360, height: 800 });
  const mobile = await cadres();
  expect(mobile.droite.y, 'aperçu sous le texte sur mobile').toBeGreaterThan(mobile.gauche.y);
  expect(Math.abs(mobile.gauche.x - mobile.droite.x), 'colonnes empilées sur mobile').toBeLessThan(
    4,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await cadres();
  expect(
    Math.abs(desktop.gauche.x - desktop.droite.x),
    'aperçu à droite du texte sur grand écran',
  ).toBeGreaterThan(100);
  expect(desktop.droite.y, 'colonnes sur la même ligne').toBeLessThan(desktop.gauche.y + 200);
});

test('l’accueil public présente toutes ses rubriques', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  for (const identifiant of ['avantages', 'usages', 'profils', 'temoignage', 'support']) {
    await expect(page.locator(`main section#${identifiant}`)).toHaveCount(1);
  }

  // Un seul titre de niveau 1, et une hiérarchie de titres cohérente.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
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
