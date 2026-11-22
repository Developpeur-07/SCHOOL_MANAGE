import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Vérifie qu'aucun secret n'est exposé au navigateur.
 *
 * Le code est distribué au client : une clé de service, un jeton
 * d'administration ou un mot de passe dans le front seraient lisibles par
 * n'importe qui. Ces tests inspectent les sources effectives plutôt qu'une
 * liste de variables, afin de détecter un secret glissé dans n'importe quel
 * fichier.
 *
 * Une variable d'environnement n'est publique que si son nom porte le
 * préfixe `NEXT_PUBLIC_`. Les autres n'ont le droit d'être lues que par du
 * code serveur : un module qui les lit ne doit donc jamais être importé par
 * un composant client, sous peine d'embarquer la valeur dans le paquet
 * envoyé au navigateur.
 */

const RACINE = path.resolve(import.meta.dirname, '..', '..', '..');
const DOSSIER_SRC = path.join(RACINE, 'src');

function fichiersSource(dossier: string): string[] {
  const trouves: string[] = [];

  for (const entree of readdirSync(dossier)) {
    if (entree === 'node_modules' || entree.startsWith('.')) continue;
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      trouves.push(...fichiersSource(complet));
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entree)) trouves.push(complet);
  }

  return trouves;
}

const SOURCES = fichiersSource(DOSSIER_SRC);

/**
 * Sources effectivement livrées au navigateur.
 *
 * Les fichiers de test ne font pas partie de l'application : ils citent
 * volontairement les motifs qu'ils traquent.
 */
const SOURCES_APPLICATION = SOURCES.filter((fichier) => !fichier.endsWith('.test.ts'));

/** Variables lues sans le préfixe public, donc réservées au serveur. */
function variablesServeur(fichier: string): string[] {
  const contenu = readFileSync(fichier, 'utf8');
  const trouvees: string[] = [];

  for (const correspondance of contenu.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    const variable = correspondance[1];
    if (variable.startsWith('NEXT_PUBLIC_') || variable === 'NODE_ENV') continue;
    trouvees.push(variable);
  }

  return trouvees;
}

/** Imports d'un fichier, résolus vers leur chemin réel. */
function importsResolus(fichier: string): string[] {
  const contenu = readFileSync(fichier, 'utf8');
  const resolus: string[] = [];

  for (const correspondance of contenu.matchAll(
    /from\s+['"]([^'"]+)['"]/g,
  )) {
    const specificateur = correspondance[1];

    if (specificateur.startsWith('@/')) {
      const base = path.join(DOSSIER_SRC, specificateur.slice(2));
      for (const candidat of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (existsSync(candidat)) {
          resolus.push(candidat);
          break;
        }
      }
      continue;
    }

    if (specificateur.startsWith('.')) {
      const base = path.resolve(path.dirname(fichier), specificateur);
      for (const candidat of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (existsSync(candidat)) {
          resolus.push(candidat);
          break;
        }
      }
    }
  }

  return resolus;
}

/** Fichiers atteignables depuis un point d'entrée, imports compris. */
function fermetureTransitive(entrees: string[]): Set<string> {
  const vus = new Set<string>();
  const pile = [...entrees];

  while (pile.length > 0) {
    const fichier = pile.pop();
    if (!fichier || vus.has(fichier)) continue;
    vus.add(fichier);
    pile.push(...importsResolus(fichier));
  }

  return vus;
}

const CLIENTS = SOURCES.filter((fichier) =>
  /^\s*['"]use client['"]/m.test(readFileSync(fichier, 'utf8')),
);

/**
 * Fichier qui contient les expressions des clés de service.
 *
 * Leur présence y est une protection : le module refuse une clé de service
 * reçue dans une variable publique. Elle n'est admise nulle part ailleurs.
 */
const FICHIER_DE_GARDE = path.join(RACINE, 'src', 'shared', 'config', 'env.ts');

describe('absence de secret exposé au front', () => {
  it('existe des sources à inspecter', () => {
    expect(SOURCES.length).toBeGreaterThan(20);
  });

  it('ne contient aucune clé de service Supabase', () => {
    for (const fichier of SOURCES_APPLICATION) {
      if (fichier === FICHIER_DE_GARDE) continue;
      const contenu = readFileSync(fichier, 'utf8');
      expect(contenu, fichier).not.toMatch(/sb_secret_/);
    }
  });

  it('refuse explicitement une clé de service reçue côté client', () => {
    const garde = readFileSync(FICHIER_DE_GARDE, 'utf8');
    expect(garde).toMatch(/sb_secret_/);
    expect(garde).toMatch(/SUPABASE_SECRET_KEY_FORBIDDEN/);
  });

  it('ne lit aucun secret directement depuis un composant client', () => {
    for (const fichier of CLIENTS) {
      const contenu = readFileSync(fichier, 'utf8');
      expect(contenu, fichier).not.toMatch(
        /process\.env\.[A-Z0-9_]*(SERVICE|SECRET|PRIVATE|PASSWORD|TOKEN)[A-Z0-9_]*/,
      );
      expect(contenu, fichier).not.toMatch(
        /process\.env\[['"][A-Z0-9_]*(SERVICE|SECRET|PRIVATE|PASSWORD|TOKEN)[A-Z0-9_]*['"]\]/,
      );
    }
  });

  it('ne contient aucun rôle `service_role` dans le code applicatif', () => {
    for (const fichier of SOURCES_APPLICATION) {
      if (fichier === FICHIER_DE_GARDE) continue;
      const contenu = readFileSync(fichier, 'utf8');
      expect(contenu, fichier).not.toMatch(/service_role/);
    }
  });

  it('n’embarque aucun module lisant une variable serveur depuis le client', () => {
    const atteintes = fermetureTransitive(CLIENTS);

    for (const fichier of atteintes) {
      const variables = variablesServeur(fichier);
      expect(
        variables,
        `${fichier} lit ${variables.join(', ')} et est atteignable depuis le client`,
      ).toEqual([]);
    }
  });

  it('ne déclare que des variables d’environnement documentées', () => {
    const variables = new Set<string>();

    for (const fichier of SOURCES_APPLICATION) {
      for (const variable of variablesServeur(fichier)) variables.add(variable);
    }

    // Les variables réservées au serveur sontFew and explicites : chacune
    // d'elles doit avoir une raison d'exister.
    for (const variable of variables) {
      expect(
        ['SUPABASE_INTERNAL_URL', 'SUPABASE_LOCAL_PROXY_TARGET', 'PREVIEW_PORT'].includes(
          variable,
        ),
        `variable serveur inattendue : ${variable}`,
      ).toBe(true);
    }
  });
});
