import { getSupabasePublicConfig, type SupabasePublicConfig } from './env';

/**
 * Configuration Supabase utilisée par le code serveur.
 *
 * Elle reprend l’URL publique, sauf si `SUPABASE_INTERNAL_URL` est définie :
 * le navigateur passe alors par une origine publique relayée vers le
 * Supabase local, tandis que le serveur joint directement cet hôte interne.
 *
 * Ce module est réservé au serveur. Il lit une variable d’environnement qui
 * n’est pas publique : l’importeur ne doit donc jamais être un composant
 * client, sous peine d’embarquer cette variable dans le paquet envoyé au
 * navigateur.
 */
export function getSupabaseServerConfig(): SupabasePublicConfig {
  const { url, anonKey } = getSupabasePublicConfig();
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  if (!internalUrl) return { url, anonKey };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(internalUrl);
  } catch {
    throw new Error('SUPABASE_INTERNAL_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('SUPABASE_INTERNAL_URL_INVALID');
  }

  return { url: parsedUrl.toString().replace(/\/$/, ''), anonKey };
}
