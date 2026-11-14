import { defineConfig } from '@playwright/test';
import { getChromiumLaunchOptions } from './scripts/chromium.mjs';

/**
 * Tests de bout en bout.
 *
 * L’application est compilée puis servie sur le port 3100, branchée sur un
 * serveur Supabase local (`tests/e2e/mock-supabase.mjs`) : les tests peuvent
 * ainsi parcourir l’espace parent connecté sans dépendre du projet hébergé.
 *
 * Attention : la compilation E2E utilise le dossier `.next` et une URL
 * Supabase locale. Après une exécution E2E, relancer `npm run build` avant
 * de servir l’application localement.
 */
const E2E_PORT = 3100;
const MOCK_SUPABASE_PORT = 54321;
const E2E_SUPABASE_URL = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const E2E_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'cle-publique-locale-de-test',
};

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    launchOptions: await getChromiumLaunchOptions(),
  },
  webServer: [
    {
      command: `node tests/e2e/mock-supabase.mjs`,
      url: `${E2E_SUPABASE_URL}/health`,
      reuseExistingServer: true,
      timeout: 20_000,
      env: { MOCK_SUPABASE_PORT: String(MOCK_SUPABASE_PORT) },
    },
    {
      command: `npm run build && npm run start -- --port ${E2E_PORT}`,
      url: `http://127.0.0.1:${E2E_PORT}`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: E2E_ENV,
    },
  ],
});
