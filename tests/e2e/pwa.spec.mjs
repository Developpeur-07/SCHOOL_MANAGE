import { test, expect } from '@playwright/test';

test('le manifeste, les icônes et les en-têtes du service worker sont valides', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('SCHOOL_MANAGE');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons).toHaveLength(3);

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect((await response.body()).byteLength).toBeGreaterThan(500);
  }

  const workerResponse = await request.get('/sw.js');
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()['service-worker-allowed']).toBe('/');
  expect(workerResponse.headers()['cache-control']).toContain('must-revalidate');
});

test('le service worker sert le shell public et aucune page privée hors ligne', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const cacheKeys = async () => page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(names.map(async (name) => {
      const cache = await caches.open(name);
      return (await cache.keys()).map((request) => request.url);
    }));
    return entries.flat();
  });

  expect(await cacheKeys()).toEqual(expect.arrayContaining([
    expect.stringMatching(/\/hors-ligne$/),
    expect.stringMatching(/\/manifest\.webmanifest$/),
  ]));

  await page.goto('/parent', { waitUntil: 'domcontentloaded' });
  expect((await cacheKeys()).some((url) => new URL(url).pathname === '/parent')).toBe(false);

  await context.setOffline(true);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SCHOOL_MANAGE');

  await page.goto('/parent', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vous êtes hors ligne');
  expect((await cacheKeys()).some((url) => new URL(url).pathname === '/parent')).toBe(false);
});

for (const path of ['/', '/connexion', '/compte-desactive', '/hors-ligne']) {
  test(`aucun débordement ni cible trop petite à 360 px : ${path}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(path, { waitUntil: 'networkidle' });

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(360);
    expect(dimensions.body).toBeLessThanOrEqual(360);

    const undersizedTargets = await page.locator('a, button, input, select').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((element) => ({
        label: element.textContent || element.getAttribute('aria-label') || element.id,
        height: element.getBoundingClientRect().height,
      }))
      .filter((target) => target.height < 44));
    expect(undersizedTargets).toEqual([]);

    if (path === '/connexion') {
      await page.screenshot({ path: testInfo.outputPath('connexion-360.png'), fullPage: true });
    }
  });
}
