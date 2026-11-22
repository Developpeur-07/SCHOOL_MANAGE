import { test, expect } from '@playwright/test';

/**
 * Conformité du site public.
 *
 * Ces tests vérifient les points qui conditionnent la mise en ligne :
 * informations légales, métadonnées sociales, plan du site, consentement à
 * la mesure d'audience, validation des formulaires, protection anti-spam,
 * appel à l'action unique, et absence de lien cassé.
 *
 * Aucune donnée réelle n'est utilisée : les maquettes du site sont fictives.
 */

/** Pages publiques explorées par le test de liens. */
const PAGES_PUBLIQUES = ['/', '/connexion', '/confidentialite', '/conditions', '/hors-ligne'];

test.describe('informations légales', () => {
  test('la politique de confidentialité est accessible et structurée', async ({ page }) => {
    await page.goto('/confidentialite', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/Politique de confidentialité/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Politique de confidentialité',
    );

    // Le sommaire renvoie vers des ancres réellement présentes.
    const entrees = page.locator('nav[aria-labelledby$="sommaire"] a');
    const nombre = await entrees.count();
    expect(nombre).toBeGreaterThan(4);

    for (let index = 0; index < nombre; index += 1) {
      const ancre = await entrees.nth(index).getAttribute('href');
      expect(ancre).toMatch(/^#[\w-]+$/);
      await expect(page.locator(ancre)).toHaveCount(1);
    }
  });

  test('les conditions générales sont accessibles et structurées', async ({ page }) => {
    await page.goto('/conditions', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/Conditions générales/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Conditions générales d’utilisation',
    );
  });

  test('les pages légales sont annoncées depuis le pied de page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('footer a[href="/confidentialite"]')).toBeVisible();
    await expect(page.locator('footer a[href="/conditions"]')).toBeVisible();
  });

  test('aucune page légale n’invente de canal de support', async ({ page }) => {
    for (const chemin of ['/confidentialite', '/conditions']) {
      await page.goto(chemin, { waitUntil: 'networkidle' });

      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
      await expect(page.locator('a[href^="http"]')).toHaveCount(0);
      await expect(page.getByText(/support@|contact@|@example\./)).toHaveCount(0);
    }
  });
});

test.describe('métadonnées et fichiers publics', () => {
  test('la page d’accueil annonce ses métadonnées', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/SCHOOL_MANAGE/);

    const description = await page
      .locator('head meta[name="description"]')
      .getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(30);

    const image = await page.locator('head meta[property="og:image"]').getAttribute('content');
    expect(image).toBeTruthy();

    const twitter = await page
      .locator('head meta[name="twitter:card"]')
      .getAttribute('content');
    expect(twitter).toBe('summary_large_image');

    const icone = await page.locator('head link[rel="icon"]').first().getAttribute('href');
    expect(icone).toBeTruthy();
  });

  test('le favicon et l’image d’aperçu sont réellement servis', async ({ request }) => {
    const favicon = await request.get('/favicon.ico');
    expect(favicon.status()).toBe(200);
    expect((await favicon.body()).length).toBeGreaterThan(500);

    const apercu = await request.get('/og-image.png');
    expect(apercu.status()).toBe(200);
    expect(apercu.headers()['content-type']).toContain('image/png');
    expect((await apercu.body()).length).toBeGreaterThan(1000);
  });

  test('le plan du site et le fichier robots sont servis', async ({ request }) => {
    const plan = await request.get('/sitemap.xml');
    expect(plan.status()).toBe(200);
    const contenu = await plan.text();
    expect(contenu).toContain('<urlset');
    expect(contenu).toContain('/confidentialite');
    expect(contenu).toContain('/conditions');

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const directives = await robots.text();
    expect(directives).toContain('Sitemap:');
    expect(directives).toContain('Disallow: /parent');
    expect(directives).toContain('Disallow: /api/');
  });

  test('l’interdiction des espaces connectés laisse la page technique lisible', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    const directives = await robots.text();

    // `/compte` est interdit : c'est la redirection vers l'espace connecté.
    expect(directives).toContain('Disallow: /compte');

    // `/compte-desactive` est une page d'information sans donnée
    // personnelle : elle doit rester explorable, faute de quoi les
    // moteurs la déclarent non indexable.
    expect(directives).toContain('Allow: /compte-desactive');
  });

  test('les en-têtes de sécurité sont présents', async ({ request }) => {
    const reponse = await request.get('/');
    const entetes = reponse.headers();

    expect(entetes['strict-transport-security']).toContain('max-age=');
    expect(entetes['x-content-type-options']).toBe('nosniff');
    expect(entetes['x-frame-options']).toBe('DENY');
    expect(entetes['referrer-policy']).toBeTruthy();
  });
});

test.describe('consentement et mesure d’audience', () => {
  test('le bandeau s’affiche et aucune mesure n’est émise avant consentement', async ({ page }) => {
    const mesures = [];
    page.on('request', (requete) => {
      if (requete.url().includes('/api/measure')) mesures.push(requete.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const bandeau = page.getByTestId('consent-banner');
    await expect(bandeau).toBeVisible();
    await expect(bandeau).toContainText('Cookies et mesure d’audience');

    // Aucun appel de mesure tant que le consentement n'est pas donné.
    await page.waitForTimeout(800);
    expect(mesures).toHaveLength(0);
  });

  test('le refus du consentement ne déclenche aucune mesure', async ({ page }) => {
    const mesures = [];
    page.on('request', (requete) => {
      if (requete.url().includes('/api/measure')) mesures.push(requete.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('consent-refuse').click();

    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(mesures).toHaveLength(0);
  });

  test('le consentement déclenche la mesure, et le retrait l’arrête', async ({ page }) => {
    const mesures = [];
    page.on('request', (requete) => {
      if (requete.url().includes('/api/measure')) mesures.push(requete.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('consent-accept').click();

    await expect.poll(() => mesures.length, { timeout: 10_000 }).toBeGreaterThan(0);

    // Le retrait du consentement arrête toute nouvelle mesure.
    const avantRetrait = mesures.length;
    await page.getByTestId('consent-withdraw').click();
    await page.waitForTimeout(800);
    expect(mesures.length).toBe(avantRetrait);
  });

  test('le choix est conservé d’une visite à l’autre', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('consent-refuse').click();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
  });

  test('la mesure ne suit jamais une page connectée', async ({ request }) => {
    // Le point d'entrée refuse tout chemin qui n'est pas public.
    const reponse = await request.post('/api/measure', {
      data: { path: '/parent/11000000-0000-4000-8000-000000000001' },
    });
    expect(reponse.status()).toBe(400);
  });
});

test.describe('formulaire de connexion', () => {
  test('les champs sont validés avant l’envoi', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByTestId('login-erreur')).toContainText('Saisissez votre adresse e-mail');

    await page.getByLabel('Adresse e-mail').fill('pas-une-adresse');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByTestId('login-erreur')).toContainText('n’est pas valide');

    await page.getByLabel('Adresse e-mail').fill('parent.demo@example.invalid');
    await page.getByLabel('Mot de passe').fill('court');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByTestId('login-erreur')).toContainText('au moins 8 caractères');
  });

  test('une soumission automatisée est refusée', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'networkidle' });

    // Le champ piège est invisible : il n'est pas accessible au clavier ni
    // annoncé, mais un robot qui remplit tous les champs le renseigne.
    await page.evaluate(() => {
      const champ = document.getElementById('website');
      if (champ) {
        champ.value = 'https://example.invalid';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.getByLabel('Adresse e-mail').fill('parent.demo@example.invalid');
    await page.getByLabel('Mot de passe').fill('SchoolDemo2026!Parent');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByTestId('login-erreur')).toBeVisible();
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('le champ piège est invisible et hors tabulation', async ({ page }) => {
    await page.goto('/connexion', { waitUntil: 'networkidle' });

    const piege = page.locator('#website');
    await expect(piege).toHaveCount(1);
    await expect(piege).toHaveAttribute('tabindex', '-1');
    await expect(piege).toHaveAttribute('autocomplete', 'off');

    const conteneur = page.locator('#website').locator('xpath=ancestor::div[1]');
    await expect(conteneur).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('appel à l’action et navigation', () => {
  test('l’accueil ne présente qu’un appel à l’action principal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const principaux = page.locator('[data-cta="principal"]');
    await expect(principaux).toHaveCount(1);
    await expect(principaux).toHaveText(/Se connecter/);
  });

  test('le panneau support ne répète pas l’accès à la connexion', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('section#support a[href="/connexion"]')).toHaveCount(0);
    await expect(page.locator('section#support [data-cta="principal"]')).toHaveCount(0);
  });

  test('aucun lien interne ne renvoie vers une erreur', async ({ page, request }) => {
    const vus = new Set();

    for (const chemin of PAGES_PUBLIQUES) {
      await page.goto(chemin, { waitUntil: 'networkidle' });

      const liens = await page
        .locator('a[href^="/"]')
        .evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));

      for (const lien of liens) {
        if (!lien || lien.startsWith('#') || vus.has(lien)) continue;
        vus.add(lien);

        const reponse = await request.get(lien);
        expect(reponse.status(), `${chemin} → ${lien}`).toBeLessThan(400);
      }
    }
  });

  test('aucun lien vide ne subsiste', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const vides = await page
      .locator('a[href=""], a[href="#"]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));

    expect(vides).toEqual([]);
  });

  test('l’écran hors connexion propose une reprise réelle', async ({ page }) => {
    await page.goto('/hors-ligne', { waitUntil: 'networkidle' });

    const reprise = page.getByRole('button', { name: 'Réessayer' });
    await expect(reprise).toBeVisible();

    // L'action recharge la page : elle n'est pas un lien vide.
    const vide = await page.locator('a[href=""]').count();
    expect(vide).toBe(0);
  });
});
