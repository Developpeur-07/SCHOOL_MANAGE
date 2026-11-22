import type { MetadataRoute } from 'next';
import { getPublicSiteUrl, hasPublicSiteUrl } from '@/shared/config/site';

/**
 * Plan du site.
 *
 * Seules les pages publiques sont annoncées. Les espaces authentifiés ne
 * le sont pas : ils sont protégés, sans valeur pour un moteur de recherche,
 * et leur présence dans un plan du site inviterait à les explorer.
 */
const PAGES_PUBLIQUES = [
  { chemin: '', priorite: 1, frequence: 'weekly' as const },
  { chemin: '/connexion', priorite: 0.6, frequence: 'monthly' as const },
  { chemin: '/conditions', priorite: 0.3, frequence: 'yearly' as const },
  { chemin: '/confidentialite', priorite: 0.3, frequence: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Hors production, le site n'a pas d'adresse de référence : annoncer
  // `http://localhost:3000` dans un plan du site serait une information
  // fausse. Le plan est donc vide tant que l'adresse publique est inconnue.
  if (!hasPublicSiteUrl()) return [];

  const base = getPublicSiteUrl();
  const date = new Date();

  return PAGES_PUBLIQUES.map((page) => ({
    url: `${base}${page.chemin}`,
    lastModified: date,
    changeFrequency: page.frequence,
    priority: page.priorite,
  }));
}
