/**
 * Classification des échecs de connexion.
 *
 * Le message affiché doit distinguer une erreur de réseau d'une erreur du
 * service d'authentification : un message unique « vérifiez votre réseau »
 * masque les pannes serveur et rend le diagnostic impossible.
 */

export type LoginFailureKind =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'serviceUnavailable'
  | 'network'
  | 'unknown';

export interface LoginErrorLike {
  message?: string | null;
  name?: string | null;
  status?: number | null;
  code?: string | null;
}

export interface LoginFailure {
  kind: LoginFailureKind;
  /** Référence courte et non sensible, affichée pour le support. */
  reference: string;
}

const NETWORK_MARKERS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'err_internet_disconnected',
  'err_network_changed',
];

function buildReference(error: LoginErrorLike | null | undefined): string {
  if (!error) return '';
  const parts: string[] = [];

  if (typeof error.status === 'number') parts.push(`HTTP ${error.status}`);
  if (error.code) parts.push(error.code);
  if (parts.length === 0 && error.name) parts.push(error.name);

  return parts.join(' · ');
}

export function classifyLoginFailure(
  error: LoginErrorLike | null | undefined,
): LoginFailure {
  const reference = buildReference(error);
  const message = (error?.message ?? '').toLowerCase();
  const status = error?.status ?? null;
  const code = error?.code ?? null;

  if (message.includes('invalid login credentials')) {
    return { kind: 'invalidCredentials', reference };
  }

  if (message.includes('email not confirmed')) {
    return { kind: 'emailNotConfirmed', reference };
  }

  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return { kind: 'rateLimited', reference };
  }

  if (
    (status !== null && status >= 500) ||
    code === 'unexpected_failure' ||
    message.includes('database error')
  ) {
    return { kind: 'serviceUnavailable', reference };
  }

  if (NETWORK_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'network', reference };
  }

  return { kind: 'unknown', reference };
}
