import { describe, expect, it } from 'vitest';
import {
  HONEYPOT_FIELD_NAME,
  MINIMUM_FILL_MS,
  evaluateLoginAttempt,
} from './login-attempt';

describe('evaluateLoginAttempt', () => {
  it('accepte une saisie humaine', () => {
    expect(evaluateLoginAttempt({ honeypot: '', elapsedMs: 4000 })).toEqual({ allowed: true });
  });

  it('refuse une soumission instantanée', () => {
    expect(evaluateLoginAttempt({ honeypot: '', elapsedMs: 10 })).toEqual({
      allowed: false,
      reason: 'tooFast',
    });
  });

  it('refuse une soumission exactement au délai minimal', () => {
    expect(evaluateLoginAttempt({ honeypot: '', elapsedMs: MINIMUM_FILL_MS - 1 })).toEqual({
      allowed: false,
      reason: 'tooFast',
    });
    expect(evaluateLoginAttempt({ honeypot: '', elapsedMs: MINIMUM_FILL_MS }).allowed).toBe(true);
  });

  it('refuse un champ piège renseigné', () => {
    expect(evaluateLoginAttempt({ honeypot: 'https://pourquoi.fr', elapsedMs: 9000 })).toEqual({
      allowed: false,
      reason: 'honeypot',
    });
  });

  it('traite un champ piège composé d’espaces comme vide', () => {
    expect(evaluateLoginAttempt({ honeypot: '   ', elapsedMs: 9000 }).allowed).toBe(true);
  });

  it('refuse une donnée manquante ou illisible', () => {
    expect(evaluateLoginAttempt({ elapsedMs: 9000 })).toEqual({
      allowed: false,
      reason: 'honeypot',
    });
    expect(evaluateLoginAttempt({ honeypot: '', elapsedMs: Number.NaN })).toEqual({
      allowed: false,
      reason: 'tooFast',
    });
    expect(evaluateLoginAttempt({})).toEqual({ allowed: false, reason: 'honeypot' });
  });
});

describe('nom du champ piège', () => {
  it('est peu probable et explicite', () => {
    expect(HONEYPOT_FIELD_NAME).toBe('website');
  });
});
