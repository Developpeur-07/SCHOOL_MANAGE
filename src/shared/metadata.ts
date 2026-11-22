import { messages } from '@/shared/config/messages';

/**
 * Image d'aperçu des réseaux sociaux.
 *
 * Elle est déclarée dans le layout racine et reprise sur chaque page qui
 * redéfinit ses métadonnées Open Graph : les métadonnées sont fusionnées
 * champ par champ, une page qui redéfinit `openGraph` remplacerait
 * entièrement celui du layout, image comprise.
 */
export const OPEN_GRAPH_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: `${messages.app.name} — ${messages.app.tagline}`,
};
