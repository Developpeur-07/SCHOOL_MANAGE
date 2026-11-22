/**
 * Protection anti-spam de la connexion.
 *
 * Deux barrières complémentaires sont appliquées :
 *
 * 1. un champ « piège » (honeypot) invisible à l'écran : un humain ne le
 *    remplit jamais, un robot qui remplit tous les champs le remplit ;
 * 2. un délai minimal de saisie : une saisie automatique est quasi
 *    instantanée, une saisie humaine ne l'est pas.
 *
 * Ces deux vérifications sont reprises côté serveur : une protection purely
 * côté navigateur se contourne trivially.
 */

/** Nom du champ piège, masqué visuellement et exclu de l'autocomplétion. */
export const HONEYPOT_FIELD_NAME = 'website';

/**
 * Délai minimal de saisie, en millisecondes.
 *
 * Assez court pour ne pas gêner une personne qui rend le focus puis saisit,
 * assez long pour écarter une soumission instantanée.
 */
export const MINIMUM_FILL_MS = 1200;

export type LoginAttemptRejection = 'honeypot' | 'tooFast';

export type LoginAttemptVerdict =
  | { allowed: true }
  | { allowed: false; reason: LoginAttemptRejection };

/**
 * Évalue une tentative de connexion.
 *
 * Une donnée absente ou illisible n'est jamais considérée comme favorable :
 * en cas de doute, la tentative est refusée.
 */
export function evaluateLoginAttempt(input: {
  honeypot?: string | null;
  elapsedMs?: number | null;
}): LoginAttemptVerdict {
  // Un champ piège absent signifie que la requête ne vient pas du
  // formulaire : elle est refusée d'emblée. Un champ piège renseigné
  // signale un robot qui remplit tous les champs.
  if (typeof input.honeypot !== 'string' || input.honeypot.trim().length > 0) {
    return { allowed: false, reason: 'honeypot' };
  }

  const elapsed = typeof input.elapsedMs === 'number' ? input.elapsedMs : Number.NaN;
  if (!Number.isFinite(elapsed) || elapsed < MINIMUM_FILL_MS) {
    return { allowed: false, reason: 'tooFast' };
  }

  return { allowed: true };
}
