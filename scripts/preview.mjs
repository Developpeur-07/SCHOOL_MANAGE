/**
 * Prévisualisation complète : Supabase local + application servie.
 *
 * Le navigateur du visiteur ne peut pas joindre `127.0.0.1` : cette adresse
 * désigne son propre poste. Pour que la connexion fonctionne, l’application
 * est donc servie avec une URL publique, et les appels Supabase sont
 * réécrits vers le serveur local par le relais de `next.config.ts`.
 *
 * Le montage complet tient en une commande :
 *
 *   npm run preview
 *
 * Elle construit l’application avec la bonne URL publique, démarre le
 * Supabase local, attend qu’il réponde, puis sert l’application.
 */

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.PREVIEW_PORT ?? 3200);
const MOCK_PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
const ANON_KEY = process.env.PREVIEW_SUPABASE_ANON_KEY ?? 'cle-publique-locale-de-test';

/**
 * Origine publique de la prévisualisation, si la plateforme en expose une.
 * En dehors d’un environnement de prévisualisation, le navigateur et le
 * serveur partagent la machine : l’URL locale suffit alors.
 */
const SANDBOX_ID = process.env.E2B_SANDBOX_ID;
const PUBLIC_ORIGIN = SANDBOX_ID ? `https://${PORT}-${SANDBOX_ID}.e2b.app` : null;
const BROWSER_ORIGIN = PUBLIC_ORIGIN ?? `http://127.0.0.1:${MOCK_PORT}`;

const APP_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: BROWSER_ORIGIN,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_INTERNAL_URL: `http://127.0.0.1:${MOCK_PORT}`,
  SUPABASE_LOCAL_PROXY_TARGET: `http://127.0.0.1:${MOCK_PORT}`,
};

const enfants = [];

/** Démarre un processus de fond et le surveille. */
function lancer(commande, arguments_, environnement, libelle) {
  const enfant = spawn(commande, arguments_, {
    env: { ...process.env, ...environnement },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  enfant.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[preview] ${libelle} s'est arrêté (code ${code}).`);
      arreter(code ?? 1);
    }
  });

  enfants.push(enfant);
  return enfant;
}

/**
 * Exécute une commande et attend sa fin.
 *
 * Indispensable pour la construction : l’application ne doit pas démarrer
 * sur un dossier `.next` incomplet.
 */
function executer(commande, arguments_, environnement, libelle) {
  return new Promise((resolve, reject) => {
    const enfant = spawn(commande, arguments_, {
      env: { ...process.env, ...environnement },
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    enfants.push(enfant);
    enfant.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${libelle} a échoué (code ${code}).`));
    });
  });
}

function arreter(code = 0) {
  for (const enfant of enfants) {
    if (!enfant.killed) enfant.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => arreter(0));
process.on('SIGTERM', () => arreter(0));

async function attendreSupabase() {
  const url = `http://127.0.0.1:${MOCK_PORT}/health`;

  for (let essai = 0; essai < 40; essai += 1) {
    try {
      const reponse = await fetch(url);
      if (reponse.ok) return;
    } catch {
      // Le serveur n'écoute pas encore.
    }
    await delay(250);
  }

  throw new Error('Le Supabase local n’a pas répondu à la demande de santé.');
}

console.log(`[preview] construction avec ${BROWSER_ORIGIN}`);
await executer('npm', ['run', 'build'], APP_ENV, 'la construction');
console.log('[preview] construction terminée');

console.log('[preview] démarrage du Supabase local');
lancer('node', ['tests/e2e/mock-supabase.mjs'], { MOCK_SUPABASE_PORT: String(MOCK_PORT) }, 'le Supabase local');

await attendreSupabase();
console.log(`[preview] Supabase local prêt sur http://127.0.0.1:${MOCK_PORT}`);

console.log(`[preview] service de l'application sur le port ${PORT}`);
lancer('npm', ['run', 'start', '--', '--port', String(PORT)], APP_ENV, "l'application");

console.log('');
console.log(`[preview] application : ${PUBLIC_ORIGIN ?? `http://127.0.0.1:${PORT}`}`);
console.log(`[preview] connexion   : parent.demo@example.invalid / SchoolDemo2026!Parent`);
console.log('[preview] Ctrl+C pour arrêter les deux processus.');
