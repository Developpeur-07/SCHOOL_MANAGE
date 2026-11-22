import { afterEach, describe, expect, it } from 'vitest';
import { getPublicSiteUrl, hasPublicSiteUrl } from './site';

const VARIABLES = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'] as const;

const originaux = new Map<string, string | undefined>();

afterEach(() => {
  for (const nom of VARIABLES) {
    const valeur = originaux.get(nom);
    if (valeur === undefined) delete process.env[nom];
    else process.env[nom] = valeur;
  }
});

function definir(nom: (typeof VARIABLES)[number], valeur: string) {
  if (!originaux.has(nom)) originaux.set(nom, process.env[nom]);
  process.env[nom] = valeur;
}

function effacerTout() {
  for (const nom of VARIABLES) {
    if (!originaux.has(nom)) originaux.set(nom, process.env[nom]);
    delete process.env[nom];
  }
}

describe('getPublicSiteUrl', () => {
  it('privilégie l’URL explicite', () => {
    effacerTout();
    definir('NEXT_PUBLIC_SITE_URL', 'https://ecole.exemple.org/');
    expect(getPublicSiteUrl()).toBe('https://ecole.exemple.org');
  });

  it('utilise l’URL de production fournie par Vercel', () => {
    effacerTout();
    definir('VERCEL_PROJECT_PRODUCTION_URL', 'liakolo.vercel.app');
    expect(getPublicSiteUrl()).toBe('https://liakolo.vercel.app');
  });

  it('retire le préfixe de protocole doublé', () => {
    effacerTout();
    definir('VERCEL_URL', 'https://liakolo.vercel.app');
    expect(getPublicSiteUrl()).toBe('https://liakolo.vercel.app');
  });

  it('retombe sur l’URL locale quand aucune adresse n’est fournie', () => {
    effacerTout();
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
  });

  it('ignore une URL explicite invalide sans faire échouer le build', () => {
    effacerTout();
    definir('NEXT_PUBLIC_SITE_URL', 'pas-une-url');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
  });
});

describe('hasPublicSiteUrl', () => {
  it('vrai dès qu’une adresse publique est connue', () => {
    effacerTout();
    definir('VERCEL_PROJECT_PRODUCTION_URL', 'liakolo.vercel.app');
    expect(hasPublicSiteUrl()).toBe(true);
  });

  it('faux en développement sans adresse configurée', () => {
    effacerTout();
    expect(hasPublicSiteUrl()).toBe(false);
  });

  it('ignore une variable vide', () => {
    effacerTout();
    definir('NEXT_PUBLIC_SITE_URL', '   ');
    expect(hasPublicSiteUrl()).toBe(false);
  });
});
