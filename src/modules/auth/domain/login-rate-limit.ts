/**
 * Limitation des tentatives de connexion.
 *
 * Le limiteur retient les échecs, pas les succès : un utilisateur légitime
 * qui se connecte vingt fois de suite ne doit pas être bloqué, alors qu'une
 * suite d'échecs doit l'être.
 *
 * Deux compartiments sont suivis séparément : l'adresse d'origine et le
 * compte visé. Une attaque qui change de compte depuis une même adresse
 * reste limitée par l'adresse ; une attaque dirigée contre un compte depuis
 * des adresses différentes reste limitée par le compte.
 *
 * L'horloge est injectable pour que le comportement soit vérifiable sans
 * attendre réellement le temps qui s'écoule.
 */

/** Nombre d'échecs tolérés par compartiment. */
export const DEFAULT_MAX_FAILURES = 5;

/** Durée de la fenêtre de comptage, en millisecondes. */
export const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/** Échecs tolérés pour l'ensemble des adresses d'une même origine. */
export const DEFAULT_MAX_FAILURES_PER_SOURCE = 20;

export interface RateLimitDecision {
  /** `false` lorsque le compartiment a atteint sa limite. */
  allowed: boolean;
  /** Nombre d'échecs enregistrés dans la fenêtre courante. */
  failures: number;
  /** Délai avant réinitialisation, en secondes. */
  retryAfterSeconds: number;
}

interface Bucket {
  failures: number;
  windowStartedAt: number;
}

export interface LoginRateLimiterOptions {
  maxFailures?: number;
  maxFailuresPerSource?: number;
  windowMs?: number;
  now?: () => number;
}

/**
 * Limiteur d'échecs en mémoire du processus.
 *
 * Ce limiteur s'applique immédiatement, sans dépendre d'une migration en
 * base : la protection est donc active dès la première mise en ligne. La
 * base, lorsqu'elle est disponible, vient renforcer ce comptage pour
 * survivre au redémarrage du processus.
 */
export class LoginRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxFailures: number;
  private readonly maxFailuresPerSource: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: LoginRateLimiterOptions = {}) {
    this.maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
    this.maxFailuresPerSource = options.maxFailuresPerSource ?? DEFAULT_MAX_FAILURES_PER_SOURCE;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Indique si une tentative est encore autorisée.
   *
   * La consultation ne modifie aucun compteur : seule la Recording d'un
   * échec change l'état.
   */
  check(bucket: string): RateLimitDecision {
    const limite = this.limitFor(bucket);
    const etat = this.etat(bucket);
    const failures = etat.failures;
    const remaining = limite - failures;

    if (remaining > 0) {
      return { allowed: true, failures, retryAfterSeconds: 0 };
    }

    const fin = etat.windowStartedAt + this.windowMs;
    return {
      allowed: false,
      failures,
      retryAfterSeconds: Math.max(1, Math.ceil((fin - this.now()) / 1000)),
    };
  }

  /** Enregistre un échec et renvoie l'état obtenu. */
  recordFailure(bucket: string): RateLimitDecision {
    const maintenant = this.now();
    const existant = this.buckets.get(bucket);

    if (!existant || maintenant - existant.windowStartedAt >= this.windowMs) {
      this.buckets.set(bucket, { failures: 1, windowStartedAt: maintenant });
      return { allowed: true, failures: 1, retryAfterSeconds: 0 };
    }

    existant.failures += 1;
    const limite = this.limitFor(bucket);
    const remaining = limite - existant.failures;

    if (remaining > 0) {
      return { allowed: true, failures: existant.failures, retryAfterSeconds: 0 };
    }

    const fin = existant.windowStartedAt + this.windowMs;
    return {
      allowed: false,
      failures: existant.failures,
      retryAfterSeconds: Math.max(1, Math.ceil((fin - maintenant) / 1000)),
    };
  }

  /** Oublie les échecs d'un compartiment, après une connexion réussie. */
  reset(bucket: string): void {
    this.buckets.delete(bucket);
  }

  /**
   * Nettoie les compartiments dont la fenêtre est expirée.
   *
   * La carte resterait sinon alimentée indéfiniment par des adresses
   * différentes.
   */
  purge(): void {
    const maintenant = this.now();
    for (const [cle, etat] of this.buckets) {
      if (maintenant - etat.windowStartedAt >= this.windowMs) {
        this.buckets.delete(cle);
      }
    }
  }

  /** Limite applicable à un compartiment. */
  private limitFor(bucket: string): number {
    return bucket.startsWith('source:') ? this.maxFailuresPerSource : this.maxFailures;
  }

  /** État courant d'un compartiment, fenêtre expirée comprise. */
  private etat(bucket: string): Bucket {
    const existant = this.buckets.get(bucket);
    if (!existant) return { failures: 0, windowStartedAt: this.now() };
    if (this.now() - existant.windowStartedAt >= this.windowMs) {
      return { failures: 0, windowStartedAt: this.now() };
    }
    return existant;
  }
}
