import { defineConfig } from '@playwright/test';
import { getChromiumLaunchOptions } from './scripts/chromium.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    launchOptions: await getChromiumLaunchOptions(),
  },
  webServer: {
    command: 'npm run start -- --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
