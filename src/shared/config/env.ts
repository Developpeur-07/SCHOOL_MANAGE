export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * Nom du cookie de session.
 *
 * `@supabase/ssr` dérive par défaut ce nom de l’hôte Supabase. Dès que le
 * navigateur et le serveur ne joignent pas le même hôte — cas d’un relais
 * de prévisualisation — le cookie écrit par l’un n’est plus lu par l’autre.
 * Un nom fixe, partagé par tous les clients, rend la session indépendante de
 * l’URL de déploiement.
 */
export const SUPABASE_COOKIE_NAME = 'sb-school-manage-auth-token';

export function hasSupabasePublicConfig(): boolean {
  try {
    getSupabasePublicConfig();
    return true;
  } catch {
    return false;
  }
}

function assertNotSecretKey(anonKey: string): void {
  if (anonKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY_FORBIDDEN');
  }

  const segments = anonKey.split('.');
  if (segments.length !== 3) return;

  let role: unknown;
  try {
    const payload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    role = JSON.parse(globalThis.atob(paddedPayload)).role;
  } catch {
    return;
  }

  if (role === 'service_role') {
    throw new Error('SUPABASE_SECRET_KEY_FORBIDDEN');
  }
}

/**
 * Configuration Supabase publique, lisible par le navigateur.
 *
 * Ce module ne contient que des variables publiques : il est importé par
 * des composants clients, et ne doit donc jamais lire une variable d
 * environnement réservée au serveur. La configuration serveur vit dans
 * `env-server.ts`, que le client n'importe jamais.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_PUBLIC_CONFIG_MISSING');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('SUPABASE_PUBLIC_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('SUPABASE_PUBLIC_URL_INVALID');
  }

  assertNotSecretKey(anonKey);
  return { url: parsedUrl.toString().replace(/\/$/, ''), anonKey };
}
