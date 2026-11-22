/**
 * Consentement et mesure d'audience.
 *
 * Deux règles gouvernent ce module :
 *
 * 1. Le cookie de session est strictement nécessaire : il est déposé par
 *    l'authentification et ne dépend d'aucun consentement. Aucun cookie
 *    supplémentaire n'est déposé par défaut.
 * 2. La mesure d'audience n'est pas nécessaire au fonctionnement du service.
 *    Elle reste donc désactivée tant qu'un consentement explicite n'a pas
 *    été donné, et elle s'arrête dès que ce consentement est retiré.
 *
 * Le choix de l'utilisateur est conservé dans `localStorage` : ce n'est pas
 * un cookie, il n'est donc pas transmis au serveur à chaque requête et ne
 * nécessite pas lui-même un consentement préalable.
 */

/** Clé de stockage du choix de l'utilisateur. */
export const CONSENT_STORAGE_KEY = 'sm-audience-consent';

/** Valeurs possibles du choix enregistré. */
export type ConsentDecision = 'granted' | 'denied';

/**
 * Pages publiques dont la consultation peut être mesurée.
 *
 * La liste est volontairement restreinte : elle exclut tout ce qui se trouve
 * derrière une authentification. Mesurer une page connectée reviendrait à
 * suivre un parcours de personne identifiée, ce que la règle de minimisation
 * interdit.
 */
export const MEASURABLE_PATHS = [
  '/',
  '/connexion',
  '/conditions',
  '/confidentialite',
  '/hors-ligne',
] as const;

export type MeasurablePath = (typeof MEASURABLE_PATHS)[number];

/**
 * Détermine si un chemin fait partie des pages mesurables.
 *
 * La comparaison est exacte : une sous-route, une chaîne de requête ou un
 * chemin non listé ne sont jamais mesurés.
 */
export function isMeasurablePath(path: string): path is MeasurablePath {
  return (MEASURABLE_PATHS as readonly string[]).includes(path);
}

/**
 * Convertit une valeur enregistrée en décision exploitable.
 *
 * Une valeur absente, illisible ou inattendue vaut refus : en cas de doute,
 * la mesure reste désactivée.
 */
export function parseConsentDecision(valeur: unknown): ConsentDecision | null {
  if (valeur === 'granted') return 'granted';
  if (valeur === 'denied') return 'denied';
  return null;
}

/**
 * Indique si une décision autorise la mesure d'audience.
 *
 * Seule une décision explicite de type « granted » l'autorise.
 */
export function isMeasurementAllowed(decision: ConsentDecision | null): boolean {
  return decision === 'granted';
}

/**
 * Liste les pages mesurables, pour les tests et la documentation.
 */
export function listMeasurablePaths(): readonly string[] {
  return MEASURABLE_PATHS;
}
