import { test, expect } from '@playwright/test';
import {
  DEMO_CREDENTIALS,
  DIRECTION_CREDENTIALS,
  SUPERVISION_CREDENTIALS,
} from './mock-supabase.mjs';
import { mesurer, verifierMiseEnPage } from './mesures.mjs';

/**
 * Étape 6 — supervision globale du management.
 *
 * Ces tests s'exécutent contre l'application servie en local, adossée à un
 * serveur Supabase de test (`tests/e2e/mock-supabase.mjs`). Les données sont
 * entièrement fictives, réparties sur deux écoles.
 *
 * Ils vérifient :
 *  - l'accès de la supervision à la vue d'ensemble des écoles ;
 *  - l'isolation stricte : un parent et un rôle d'école sont renvoyés vers
 *    leur propre espace et n'atteignent jamais la supervision ;
 *  - le caractère strictement consultatif de la page ;
 *  - la mise en page mobile de la page de supervision.
 */

async function connecter(page, identifiants) {
  await page.goto('/connexion', { waitUntil: 'networkidle' });
  await page.getByLabel('Adresse e-mail').fill(identifiants.email);
  await page.getByLabel('Mot de passe').fill(identifiants.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(compte|parent|supervision)/, { timeout: 20_000 });
}

test.describe('supervision globale', () => {
  test('un visiteur non connecté est renvoyé vers la connexion', async ({ page }) => {
    await page.goto('/supervision', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('le compte de supervision accède à la vue d’ensemble des écoles', async ({ page }) => {
    await connecter(page, SUPERVISION_CREDENTIALS);
    await page.waitForURL(/\/supervision/, { timeout: 20_000 });

    await expect(
      page.getByRole('heading', { name: 'Supervision globale', level: 1 }),
    ).toBeVisible();

    // Les deux écoles de la plateforme sont listées.
    await expect(
      page.getByRole('heading', { name: 'École Démo Fictive', exact: true, level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'École Démo Fictive B', exact: true, level: 3 }),
    ).toBeVisible();

    // `innerText` restitue la casse appliquée par CSS : la comparaison est
    // faite sans tenir compte de la casse.
    const corps = (await page.locator('main').innerText()).toLowerCase();
    expect(corps).toContain('écoles supervisées');
    expect(corps).toContain('répartition des comptes');
    expect(corps).toContain('totaux financiers par devise');
    expect(corps).toContain('xaf');
    expect(corps).toContain('eur');
    expect(corps).toContain('super-admin');
  });

  test('la supervision reste strictement consultative', async ({ page }) => {
    await connecter(page, SUPERVISION_CREDENTIALS);
    await page.waitForURL(/\/supervision/, { timeout: 20_000 });

    await expect(
      page.getByText('Consultation seule : la supervision ne crée ni ne modifie aucune donnée.'),
    ).toBeVisible();

    // Aucun formulaire ni bouton d'action métier sur la page.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('main button')).toHaveCount(0);
    await expect(page.locator('main input')).toHaveCount(0);
  });

  test('un parent est renvoyé vers son espace et n’atteint pas la supervision', async ({
    page,
  }) => {
    await connecter(page, DEMO_CREDENTIALS);
    await page.goto('/supervision', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/parent/);
    const corps = await page.locator('main').innerText();
    expect(corps).not.toContain('École Démo Fictive B');
    expect(corps).not.toContain('Répartition des comptes');
    expect(corps).not.toContain('Totaux financiers par devise');
  });

  test('un rôle d’école est renvoyé vers le portail de son école', async ({ page }) => {
    await connecter(page, DIRECTION_CREDENTIALS);
    await page.goto('/supervision', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/ecole/);
    const corps = await page.locator('main').innerText();
    expect(corps).not.toContain('École Démo Fictive B');
    expect(corps).not.toContain('Totaux financiers par devise');
  });

  test('la page de supervision tient dans un écran de téléphone', async ({ page }) => {
    await connecter(page, SUPERVISION_CREDENTIALS);
    await page.waitForURL(/\/supervision/, { timeout: 20_000 });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(200);

    const mesures = await mesurer(page);
    expect(verifierMiseEnPage(mesures)).toEqual([]);
  });
});
