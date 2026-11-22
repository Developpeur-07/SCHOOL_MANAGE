import type { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/shared/config/site';

/**
 * Directives pour les robots.
 *
 * Les pages publiques sont ouvertes. Les espaces authentifiés et les
 * points d'entrée techniques sont exclus : ils ne doivent pas être
 * explorés, et leur contenu n'a aucun intérêt public.
 *
 * Deux règles se disputent le chemin `/compte` :
 *
 * - `/compte` est interdit : c'est la page de redirection vers l'espace
 *   connecté, elle n'a rien à faire dans un index ;
 * - `/compte-desactive` est autorisée explicitement.
 *
 * Le protocole d'exclusion raisonne par préfixe : `Disallow: /compte`
 * interdirait donc aussi `/compte-desactive`. La règle d'autorisation la
 * plus longue l'emporte, et `/compte-desactive` l'est de treize caractères
 * de plus que `/compte`. C'est la seule façon d'interdire un chemin
 * exactement, sans regex ni extension propriétaire.
 */
const ZONES_EXCLUES = [
  '/api/',
  '/compte',
  '/ecole',
  '/enseignant',
  '/parent',
  '/supervision',
];

/** Pages autorisées malgré l'interdiction d'un préfixe voisin. */
const PAGES_AUTORISEES = ['/compte-desactive'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', ...PAGES_AUTORISEES],
        disallow: ZONES_EXCLUES,
      },
    ],
    sitemap: `${getPublicSiteUrl()}/sitemap.xml`,
    host: getPublicSiteUrl(),
  };
}
