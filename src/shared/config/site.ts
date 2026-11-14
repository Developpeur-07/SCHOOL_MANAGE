/**
 * URL publique du site.
 *
 * Aucun domaine n'est codé en dur dans l'application : la valeur provient
 * de l'hébergeur (Vercel expose `VERCEL_PROJECT_PRODUCTION_URL` et
 * `VERCEL_URL` pendant le build) ou d'une variable `NEXT_PUBLIC_SITE_URL`
 * posée explicitement.
 *
 * Deux notions sont distinctes :
 * - `getPublicSiteUrl()` donne toujours une base exploitable, y compris en
 *   développement, où elle sert de repli local ;
 * - `hasPublicSiteUrl()` indique si cette base est une adresse publique
 *   connue. Seule une adresse publique known permet de publier une URL
 *   `canonical` : annoncer `http://localhost` comme URL canonique serait
 *   faux, et l'omettre est préférable.
 */

const REPLI_LOCAL = 'http://localhost:3000';

function lireVariable(nom: string): string | null {
  const valeur = process.env[nom];
  if (!valeur) return null;

  const nettoyee = valeur.trim();
  return nettoyee.length > 0 ? nettoyee : null;
}

/** `true` si une adresse publique du site est connue de l'environnement. */
export function hasPublicSiteUrl(): boolean {
  return Boolean(
    lireVariable('NEXT_PUBLIC_SITE_URL') ??
      lireVariable('VERCEL_PROJECT_PRODUCTION_URL') ??
      lireVariable('VERCEL_URL'),
  );
}

/** URL de base du site, servant aux métadonnées et aux URL canoniques. */
export function getPublicSiteUrl(): string {
  const explicite = lireVariable('NEXT_PUBLIC_SITE_URL');
  if (explicite) {
    try {
      return new URL(explicite).toString().replace(/\/$/, '');
    } catch {
      // Une valeur invalide ne doit pas empêcher le build : on retombe sur
      // l'adresse fournie par l'hébergeur.
    }
  }

  const production = lireVariable('VERCEL_PROJECT_PRODUCTION_URL');
  if (production) return `https://${production.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  const vercel = lireVariable('VERCEL_URL');
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  return REPLI_LOCAL;
}
