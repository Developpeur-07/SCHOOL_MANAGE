/**
 * Scènes de l'aperçu public.
 *
 * L'accueil présente les écrans de l'espace parent sous forme de scènes
 * statiques. Les identifiants suivent les onglets réels de l'espace parent
 * (`src/modules/parent/domain/tabs.ts`) afin que l'aperçu et l'application
 * restent alignés.
 */

export const SCENE_IDS = ['resume', 'resultats', 'vie-scolaire', 'paiements', 'infos'] as const;

export type SceneId = (typeof SCENE_IDS)[number];

/** Durée d'une rotation complète de l'aperçu, en millisecondes. */
export const SCENE_ROTATION_MS = 4500;

/** Nombre de scènes : strictement positif. */
function assertPositiveCount(total: number): void {
  if (!Number.isInteger(total) || total <= 0) {
    throw new RangeError('Le nombre de scènes doit être un entier positif.');
  }
}

/** Indice de la scène suivante, avec bouclage sur la première scène. */
export function nextSceneIndex(current: number, total: number): number {
  assertPositiveCount(total);
  if (!Number.isInteger(current) || current < 0 || current >= total) {
    return 0;
  }
  return (current + 1) % total;
}

/** Indice de la scène précédente, avec bouclage sur la dernière scène. */
export function previousSceneIndex(current: number, total: number): number {
  assertPositiveCount(total);
  if (!Number.isInteger(current) || current < 0 || current >= total) {
    return 0;
  }
  return (current - 1 + total) % total;
}

/** `true` si la valeur correspond à un identifiant de scène connu. */
export function isSceneId(value: string): value is SceneId {
  return (SCENE_IDS as readonly string[]).includes(value);
}

/**
 * Associe chaque identifiant de scène à son libellé public.
 *
 * L'ordre est celui de `SCENE_IDS` : la rotation et les indicateurs suivent
 * donc l'ordre réel des onglets de l'espace parent, et non l'ordre du
 * fichier de traduction.
 */
export function getPublicScenes(
  scenes: readonly { id: string; title: string; description: string }[],
): { id: SceneId; title: string; description: string }[] {
  return SCENE_IDS.map((id) => {
    const scene = scenes.find((candidate) => candidate.id === id);
    if (!scene) {
      throw new Error(`Scène publique manquante : ${id}`);
    }
    return { id, title: scene.title, description: scene.description };
  });
}
