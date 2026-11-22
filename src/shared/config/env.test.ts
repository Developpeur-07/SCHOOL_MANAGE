import { afterEach, describe, expect, it } from 'vitest';
import {
  getSupabasePublicConfig,
  hasSupabasePublicConfig,
  SUPABASE_COOKIE_NAME,
} from './env';
import { getSupabaseServerConfig } from './env-server';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalInternalUrl = process.env.SUPABASE_INTERNAL_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;

  if (originalInternalUrl === undefined) delete process.env.SUPABASE_INTERNAL_URL;
  else process.env.SUPABASE_INTERNAL_URL = originalInternalUrl;
});

describe('configuration publique Supabase', () => {
  it('signale une configuration absente sans produire de secret', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(hasSupabasePublicConfig()).toBe(false);
    expect(() => getSupabasePublicConfig()).toThrow('SUPABASE_PUBLIC_CONFIG_MISSING');
  });

  it('normalise l’URL et conserve uniquement la clé publique fournie', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://projet.supabase.co/';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    expect(getSupabasePublicConfig()).toEqual({
      url: 'https://projet.supabase.co',
      anonKey: 'cle-publique-de-test',
    });
  });

  it('refuse un protocole non HTTP(S)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'file:///etc/passwd';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    expect(() => getSupabasePublicConfig()).toThrow('SUPABASE_PUBLIC_URL_INVALID');
  });

  it.each([`sb_${'secret_exemple'}`, 'legacy-service-role-jwt'])(
    'refuse une clé privilégiée dans la variable publique : %s',
    (keyKind) => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://projet.supabase.co';
      if (keyKind === 'legacy-service-role-jwt') {
        const encode = (value: object) => globalThis
          .btoa(JSON.stringify(value))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = `${encode({ alg: 'HS256' })}.${encode({ role: 'service_role' })}.signature`;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = keyKind;
      }

      expect(hasSupabasePublicConfig()).toBe(false);
      expect(() => getSupabasePublicConfig()).toThrow('SUPABASE_SECRET_KEY_FORBIDDEN');
    },
  );
});

describe('configuration serveur Supabase', () => {
  it('reprend l’URL publique quand aucune URL interne n’est définie', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://projet.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    delete process.env.SUPABASE_INTERNAL_URL;

    expect(getSupabaseServerConfig()).toEqual({
      url: 'https://projet.supabase.co',
      anonKey: 'cle-publique-de-test',
    });
  });

  it('sépare l’hôte interne du serveur de l’origine publique du navigateur', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://apercu.exemple.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    process.env.SUPABASE_INTERNAL_URL = 'http://127.0.0.1:54321/';

    expect(getSupabaseServerConfig()).toEqual({
      url: 'http://127.0.0.1:54321',
      anonKey: 'cle-publique-de-test',
    });
  });

  it('refuse une URL interne non HTTP(S)', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://projet.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-publique-de-test';
    process.env.SUPABASE_INTERNAL_URL = 'file:///etc/passwd';

    expect(() => getSupabaseServerConfig()).toThrow('SUPABASE_INTERNAL_URL_INVALID');
  });

  it('exige une configuration publique valide', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_INTERNAL_URL;

    expect(() => getSupabaseServerConfig()).toThrow('SUPABASE_PUBLIC_CONFIG_MISSING');
  });

  it('fixe un nom de cookie indépendant de l’URL de déploiement', () => {
    expect(SUPABASE_COOKIE_NAME).toBe('sb-school-manage-auth-token');
    expect(SUPABASE_COOKIE_NAME).not.toContain('supabase.co');
  });
});
