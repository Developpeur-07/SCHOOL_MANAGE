import { mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { getChromiumLaunchOptions } from './chromium.mjs';

const baseUrl = process.env.PREVIEW_URL ?? 'http://127.0.0.1:3000';
const outputDirectory = new URL('../test-results/lighthouse/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const launchOptions = await getChromiumLaunchOptions();
const chrome = await launch({
  chromePath: launchOptions.executablePath,
  chromeFlags: launchOptions.args,
  logLevel: 'error',
});

const routes = ['/', '/connexion', '/compte-desactive', '/hors-ligne'];
const results = [];
let failed = false;

try {
  for (const route of routes) {
    const runnerResult = await lighthouse(new URL(route, baseUrl).href, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 800,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });

    if (!runnerResult) throw new Error(`Lighthouse n’a produit aucun résultat pour ${route}`);
    const slug = route === '/' ? 'accueil' : route.slice(1);
    await writeFile(new URL(`${slug}.html`, outputDirectory), runnerResult.report);
    await writeFile(
      new URL(`${slug}.json`, outputDirectory),
      JSON.stringify(runnerResult.lhr, null, 2),
    );

    const scores = Object.fromEntries(
      Object.entries(runnerResult.lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)]),
    );
    const routePassed = Object.values(scores).every((score) => score >= 90);
    failed ||= !routePassed;
    results.push({ route, ...scores, passed: routePassed });
  }
} finally {
  await chrome.kill();
}

console.table(results);
console.log(`Rapports : ${outputDirectory.pathname}`);
if (failed) process.exitCode = 1;
