/**
 * Prévisualisation complète de l’application.
 *
 * Trois modes, choisis par `PREVIEW_MODE` :
 *
 * - `hybrid` (défaut) : le navigateur s’authentifie directement sur le projet
 *   Supabase hébergé, comme en production, tandis que le serveur lit le
 *   Supabase local du harnais E2E. C’est le mode qui fonctionne derrière le
 *   proxy de prévisualisation de la plateforme, qui refuse la requête
 *   d’authentification relayée par un code HTTP 403 : le navigateur ne passe
 *   alors jamais par ce proxy pour joindre Supabase.
 * - `local` : le navigateur et le serveur joignent tous deux le Supabase local,
 *   par relais. Ce mode suppose que le proxy relaie les appels `/auth/v1` et
 *   `/rest/v1`.
 * - `hosted` : le navigateur et le serveur joignent le projet hébergé. Ce mode
 *   suppose que la machine qui sert l’application peut l’atteindre.
 *
 * Dans les deux premiers modes, la commande construit l’application, puis la
 * sert sur le port 3200 :
 *
 *   npm run preview
 *   PREVIEW_MODE=local npm run preview
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.PREVIEW_PORT ?? 3200);
const MOCK_PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
const MODE = process.env.PREVIEW_MODE ?? 'hybrid';

/** Valeurs par défaut issues de `.env.local`, sans écraser l’environnement. */
function chargerEnvLocal() {
  try {
    const contenu = readFileSync('.env.local', 'utf8');
    for (const ligne of contenu.split('\n')) {
      const trimmed = ligne.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separateur = trimmed.indexOf('=');
      if (separateur === -1) continue;
      const cle = trimmed.slice(0, separateur).trim();
      const valeur = trimmed.slice(separateur + 1).trim();
      if (process.env[cle] === undefined) process.env[cle] = valeur;
    }
  } catch {
    // Pas de fichier local : l’environnement suffit, ou le mode est mal configuré.
  }
}

chargerEnvLocal();

const SANDBOX_ID = process.env.E2B_SANDBOX_ID;
const ORIGINE_PUBLIQUE = SANDBOX_ID ? `https://${PORT}-${SANDBOX_ID}.e2b.app` : null;

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

let environnement = {};
let identifiants = '';
let demarrerMock = false;

const CLE_LOCALE = process.env.PREVIEW_SUPABASE_ANON_KEY ?? 'cle-publique-locale-de-test';
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;

if (MODE === 'local') {
  const origineNavigateur = ORIGINE_PUBLIQUE ?? MOCK_URL;

  environnement = {
    NEXT_PUBLIC_SUPABASE_URL: origineNavigateur,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: CLE_LOCALE,
    SUPABASE_INTERNAL_URL: MOCK_URL,
    SUPABASE_LOCAL_PROXY_TARGET: MOCK_URL,
  };

  demarrerMock = true;

  identifiants =
    'parent.demo@example.invalid / SchoolDemo2026!Parent — ' +
    'direction.demo@example.invalid / SchoolDemo2026!Direction — ' +
    'supervision.demo@example.invalid / SchoolDemo2026!Supervision';
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !cle) {
    throw new Error(
      'Configuration Supabase absente : renseignez NEXT_PUBLIC_SUPABASE_URL et ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY, ou dans .env.local.',
    );
  }

  environnement = {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: cle,
  };

  if (MODE === 'hybrid') {
    // Le serveur lit le mock local ; le navigateur reste sur le projet hébergé.
    environnement.SUPABASE_INTERNAL_URL = MOCK_URL;
    demarrerMock = true;
  }

  identifiants =
    'parent.a1@example.invalid / SchoolDemo2026!Parent — ' +
    'direction.a@example.invalid / SchoolDemo2026!Direction — ' +
    'comptable.a@example.invalid / SchoolDemo2026!Comptable — ' +
    'enseignant.a@example.invalid / SchoolDemo2026!Enseignant — ' +
    'secretariat.a@example.invalid / SchoolDemo2026!Secretariat — ' +
    'surveillant.a@example.invalid / SchoolDemo2026!Surveillant';
}

console.log(`[preview] mode ${MODE}`);
console.log(`[preview] construction avec ${environnement.NEXT_PUBLIC_SUPABASE_URL}`);
await executer('npm', ['run', 'build'], environnement, 'la construction');
console.log('[preview] construction terminée');

if (demarrerMock) {
  console.log('[preview] démarrage du Supabase local');
  lancer('node', ['tests/e2e/mock-supabase.mjs'], { MOCK_SUPABASE_PORT: String(MOCK_PORT) }, 'le Supabase local');
  await attendreSupabase();
  console.log(`[preview] Supabase local prêt sur ${MOCK_URL}`);
}

console.log(`[preview] service de l'application sur le port ${PORT}`);
lancer('npm', ['run', 'start', '--', '--port', String(PORT)], environnement, "l'application");

console.log('');
console.log(`[preview] application : ${ORIGINE_PUBLIQUE ?? `http://127.0.0.1:${PORT}`}`);
console.log(`[preview] connexion   : ${identifiants}`);
console.log('[preview] Ctrl+C pour arrêter les processus.');
