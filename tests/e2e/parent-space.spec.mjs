import { test, expect } from '@playwright/test';
import { DEMO_CREDENTIALS, STUDENT_ERROR } from './mock-supabase.mjs';
import { mesurer, verifierMiseEnPage } from './mesures.mjs';

/**
 * Étape 5 — espace parent : navigation, isolation, états et responsive.
 *
 * Ces tests s'exécutent contre l'application servie en local, adossée à un
 * serveur Supabase de test (`tests/e2e/mock-supabase.mjs`). Les données sont
 * entièrement fictives.
 */

const STUDENT_A1 = '11000000-0000-4000-8000-000000000001';
const STUDENT_A2 = '11000000-0000-4000-8000-000000000002';
const STUDENT_A3 = '11000000-0000-4000-8000-000000000003';

const ONGLETS = [
  { id: 'resume', libelle: 'Résumé', segment: '' },
  { id: 'resultats', libelle: 'Résultats', segment: '/resultats' },
  { id: 'vie-scolaire', libelle: 'Vie scolaire', segment: '/vie-scolaire' },
  { id: 'paiements', libelle: 'Paiements', segment: '/paiements' },
  { id: 'infos', libelle: 'Infos', segment: '/infos' },
];

const NAVIGATION = 'Sections de l’espace de l’enfant';

async function connecter(page) {
  await page.goto('/connexion', { waitUntil: 'networkidle' });
  await page.getByLabel('Adresse e-mail').fill(DEMO_CREDENTIALS.email);
  await page.getByLabel('Mot de passe').fill(DEMO_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(compte|parent)/, { timeout: 20_000 });
}

async function ouvrirEspaceEnfant(page, studentId = STUDENT_A1) {
  await connecter(page);
  await page.goto(`/parent/${studentId}`, { waitUntil: 'networkidle' });
  await attendreContenu(page);
}

/** Attend la fin du chargement serveur (le squelette est remplacé par les données). */
async function attendreContenu(page) {
  await expect(page.getByText('Chargement de l’espace de l’enfant…')).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function cliquerOnglet(page, libelle) {
  const navigation = page.getByRole('navigation', { name: NAVIGATION });
  await navigation.getByRole('link', { name: libelle, exact: true }).click();
  await attendreContenu(page);
}

test.describe('espace parent', () => {
  test('un visiteur non connecté est renvoyé vers la connexion', async ({ page }) => {
    await page.goto(`/parent/${STUDENT_A1}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('un parent multi-enfants accède à son espace et choisit son enfant', async ({ page }) => {
    await ouvrirEspaceEnfant(page);

    await expect(page.getByRole('navigation', { name: NAVIGATION })).toBeVisible();

    const selecteur = page.getByLabel('Enfant consulté');
    await expect(selecteur).toBeVisible();
    await expect(selecteur.locator('option')).toHaveCount(3);

    await selecteur.selectOption(STUDENT_A2);
    await page.waitForURL(new RegExp(`/parent/${STUDENT_A2}`));
    await attendreContenu(page);
    await expect(selecteur).toHaveValue(STUDENT_A2);
  });

  test('les cinq onglets s’affichent, se naviguent et marquent l’onglet actif', async ({ page }) => {
    await ouvrirEspaceEnfant(page);

    const navigation = page.getByRole('navigation', { name: NAVIGATION });

    for (const onglet of ONGLETS) {
      const lien = navigation.getByRole('link', { name: onglet.libelle, exact: true });
      await expect(lien).toBeVisible();

      await lien.click();
      await page.waitForURL(new RegExp(`/parent/${STUDENT_A1}${onglet.segment}$`));
      await attendreContenu(page);
      await expect(lien).toHaveAttribute('aria-current', 'page');
    }
  });

  test('l’URL porte l’identifiant de l’enfant et les onglets la conservent', async ({ page }) => {
    await ouvrirEspaceEnfant(page, STUDENT_A2);

    const navigation = page.getByRole('navigation', { name: NAVIGATION });
    await navigation.getByRole('link', { name: 'Paiements', exact: true }).click();
    await page.waitForURL(new RegExp(`/parent/${STUDENT_A2}/paiements$`));

    const liens = await navigation.locator('a').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href')),
    );
    expect(liens).toHaveLength(5);
    for (const lien of liens) {
      expect(lien).toContain(STUDENT_A2);
    }
  });

  test('un enfant non lié affiche la page introuvable', async ({ page }) => {
    await connecter(page);
    await page.goto(`/parent/${STUDENT_A3}`, { waitUntil: 'networkidle' });

    await expect(
      page.getByRole('heading', { name: 'Cet enfant n’est pas rattaché à votre compte' }),
    ).toBeVisible();

    const corps = await page.locator('main').innerText();
    expect(corps).not.toContain('Enfant Démo A3');
    // Une seule zone `main` : la coquille et la page d’erreur ne se doublent pas.
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('aucune donnée d’un autre enfant n’est visible', async ({ page }) => {
    await ouvrirEspaceEnfant(page);

    const corps = await page.locator('main').innerText();
    expect(corps).not.toContain('Enfant Démo A3');
    expect(corps).not.toContain('Devoir d’un autre enfant');
    expect(corps).not.toContain('Frais d’un autre enfant');
    expect(corps).not.toContain('Donnée d’un autre enfant');
  });

  test('les notes publiées sont visibles et le brouillon jamais', async ({ page }) => {
    await ouvrirEspaceEnfant(page);
    await cliquerOnglet(page, 'Résultats');

    const contenu = page.locator('main');
    await expect(contenu).toContainText('Devoir fictif A1');
    await expect(contenu).toContainText('Composition fictive A1');
    await expect(contenu).not.toContainText('Brouillon jamais publié');
  });

  test('chaque onglet affiche ses données et ses états vides', async ({ page }) => {
    await ouvrirEspaceEnfant(page);
    const contenu = page.locator('main');

    // Résumé : moyenne, assiduité, frais et dernières informations.
    await expect(contenu).toContainText(/Moyenne/i);
    await expect(contenu).toContainText(/Jours présents/i);
    await expect(contenu).toContainText(/Reste à payer/i);

    // Vie scolaire : présence, absence et retard.
    await cliquerOnglet(page, 'Vie scolaire');
    await expect(contenu).toContainText('Présent');
    await expect(contenu).toContainText('Absent');
    await expect(contenu).toContainText('Retard');

    // Paiements : frais, reçu et mode de règlement.
    await cliquerOnglet(page, 'Paiements');
    await expect(contenu).toContainText('Frais de scolarité A1');
    await expect(contenu).toContainText('REC-DEMO-A1');
    await expect(contenu).toContainText('Espèces');

    // Infos : annonces et notifications de l’enfant.
    await cliquerOnglet(page, 'Infos');
    await expect(contenu).toContainText('Réunion de rentrée fictive');
    await expect(contenu).not.toContainText('Brouillon invisible');
  });

  test('le second enfant n’affiche que ses propres données', async ({ page }) => {
    await ouvrirEspaceEnfant(page, STUDENT_A2);
    await cliquerOnglet(page, 'Résultats');

    const contenu = page.locator('main');
    await expect(contenu).toContainText('Devoir fictif A2');
    await expect(contenu).not.toContainText('Devoir fictif A1');
  });

  test('aucun contrôle d’écriture n’est proposé au parent', async ({ page }) => {
    await ouvrirEspaceEnfant(page);

    const boutons = await page.locator('main button, main form').allTextContents();
    expect(boutons).toEqual([]);
    await expect(page.getByText('Consultation seule')).toBeVisible();
  });

  test('un échec de lecture affiche l’état d’erreur et permet de réessayer', async ({ page }) => {
    await connecter(page);
    await page.goto(`/parent/${STUDENT_ERROR}`, { waitUntil: 'networkidle' });

    const titre = page.getByRole('heading', { name: 'Cet onglet n’a pas pu être chargé' });
    await expect(titre).toBeVisible();

    const reessayer = page.getByRole('button', { name: 'Réessayer' });
    await expect(reessayer).toBeVisible();

    // La reprise relance le chargement sans casser l’interface.
    await reessayer.click();
    await expect(titre).toBeVisible();
    await expect(page.getByRole('navigation', { name: NAVIGATION })).toBeVisible();
  });

  test('la navigation par onglets reste utilisable sur téléphone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await ouvrirEspaceEnfant(page);

    const navigation = page.getByRole('navigation', { name: NAVIGATION });
    await expect(navigation.getByRole('link', { name: 'Infos', exact: true })).toBeVisible();

    await navigation.getByRole('link', { name: 'Infos', exact: true }).click();
    await page.waitForURL(/infos$/);
    await attendreContenu(page);
    await expect(navigation.getByRole('link', { name: 'Infos', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

const VIEWPORTS = [
  { name: '320 px', width: 320, height: 640 },
  { name: '360 px', width: 360, height: 800 },
  { name: '390 px', width: 390, height: 844 },
  { name: '768 px', width: 768, height: 1024 },
  { name: '1024 px', width: 1024, height: 768 },
  { name: '1440 px', width: 1440, height: 900 },
];

test.describe('mise en page de l’espace parent', () => {
  for (const viewport of VIEWPORTS) {
    for (const onglet of ONGLETS) {
      test(`aucun débordement ni cible trop petite à ${viewport.name} : ${onglet.libelle}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await ouvrirEspaceEnfant(page);
        await cliquerOnglet(page, onglet.libelle);

        const mesures = await mesurer(page);
        expect(verifierMiseEnPage(mesures)).toEqual([]);
      });
    }
  }
});
