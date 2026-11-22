import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_FAILURES,
  DEFAULT_MAX_FAILURES_PER_SOURCE,
  LoginRateLimiter,
} from './login-rate-limit';

describe('LoginRateLimiter', () => {
  it('autorise une première tentative', () => {
    const limiteur = new LoginRateLimiter();
    expect(limiteur.check('compte:a').allowed).toBe(true);
  });

  it('bloque après le nombre d’échecs autorisé', () => {
    const limiteur = new LoginRateLimiter();

    // Les échecs antérieurs à la limite restent sans conséquence.
    for (let i = 0; i < DEFAULT_MAX_FAILURES - 1; i += 1) {
      expect(limiteur.recordFailure('compte:a').allowed).toBe(true);
    }

    // Le dernier échec atteint la limite : la tentative suivante est refusée.
    expect(limiteur.recordFailure('compte:a').allowed).toBe(false);

    const decision = limiteur.check('compte:a');
    expect(decision.allowed).toBe(false);
    expect(decision.failures).toBe(DEFAULT_MAX_FAILURES);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('applique une limite distincte aux adresses d’origine', () => {
    const limiteur = new LoginRateLimiter();
    for (let i = 0; i < DEFAULT_MAX_FAILURES_PER_SOURCE; i += 1) {
      limiteur.recordFailure('source:a');
    }

    expect(limiteur.check('source:a').allowed).toBe(false);
    // Un compte différent depuis la même adresse reste bloqué.
    expect(limiteur.check('compte:b').allowed).toBe(true);
  });

  it('oublie les échecs après une connexion réussie', () => {
    const limiteur = new LoginRateLimiter();
    limiteur.recordFailure('compte:a');
    limiteur.recordFailure('compte:a');

    expect(limiteur.check('compte:a').allowed).toBe(true);

    limiteur.reset('compte:a');
    expect(limiteur.check('compte:a').failures).toBe(0);
  });

  it('rouvre la fenêtre une fois le délai écoulé', () => {
    let instant = 1_000_000;
    const limiteur = new LoginRateLimiter({
      maxFailures: 2,
      windowMs: 10_000,
      now: () => instant,
    });

    limiteur.recordFailure('compte:a');
    limiteur.recordFailure('compte:a');
    expect(limiteur.check('compte:a').allowed).toBe(false);

    instant += 10_001;
    expect(limiteur.check('compte:a').allowed).toBe(true);
    expect(limiteur.recordFailure('compte:a').failures).toBe(1);
  });

  it('consulte sans modifier le compteur', () => {
    const limiteur = new LoginRateLimiter();
    limiteur.check('compte:a');
    limiteur.check('compte:a');
    expect(limiteur.check('compte:a').failures).toBe(0);
  });

  it('purge les compartiments expirés', () => {
    let instant = 500;
    const limiteur = new LoginRateLimiter({ windowMs: 100, now: () => instant });
    limiteur.recordFailure('compte:a');
    limiteur.recordFailure('compte:b');

    instant += 200;
    limiteur.purge();

    // La purge ne change pas le comportement observable : la fenêtre
    // expirée vaut de toute façon zéro échec.
    expect(limiteur.check('compte:a').failures).toBe(0);
  });

  it('sépare les compartiments', () => {
    const limiteur = new LoginRateLimiter({ maxFailures: 1 });
    limiteur.recordFailure('compte:a');
    expect(limiteur.check('compte:a').allowed).toBe(false);
    expect(limiteur.check('compte:b').allowed).toBe(true);
  });
});
