import { describe, expect, it } from 'vitest';
import { classifyLoginFailure } from './login-error';

describe('classifyLoginFailure', () => {
  it('détecte les identifiants invalides', () => {
    expect(
      classifyLoginFailure({ message: 'Invalid login credentials', status: 400 }),
    ).toEqual({ kind: 'invalidCredentials', reference: 'HTTP 400' });
  });

  it('détecte un e-mail non confirmé', () => {
    expect(classifyLoginFailure({ message: 'Email not confirmed', status: 400 })).toEqual({
      kind: 'emailNotConfirmed',
      reference: 'HTTP 400',
    });
  });

  it('détecte un quota dépassé', () => {
    expect(classifyLoginFailure({ message: 'Too many requests', status: 429 })).toEqual({
      kind: 'rateLimited',
      reference: 'HTTP 429',
    });
  });

  it('détecte une panne du service d’authentification', () => {
    expect(
      classifyLoginFailure({
        message: 'Database error querying schema',
        status: 500,
        code: 'unexpected_failure',
      }),
    ).toEqual({ kind: 'serviceUnavailable', reference: 'HTTP 500 · unexpected_failure' });
  });

  it('détecte une panne serveur sans code', () => {
    expect(classifyLoginFailure({ message: 'Database error querying schema' }).kind).toBe(
      'serviceUnavailable',
    );
    expect(classifyLoginFailure({ status: 503 }).kind).toBe('serviceUnavailable');
  });

  it('détecte une erreur réseau distincte d’une panne serveur', () => {
    expect(classifyLoginFailure({ message: 'Failed to fetch', name: 'TypeError' })).toEqual({
      kind: 'network',
      reference: 'TypeError',
    });
    expect(classifyLoginFailure({ message: 'NetworkError when attempting to fetch' }).kind).toBe(
      'network',
    );
  });

  it('retombe sur unknown sans information exploitable', () => {
    expect(classifyLoginFailure({ message: 'oups' })).toEqual({ kind: 'unknown', reference: '' });
    expect(classifyLoginFailure(null)).toEqual({ kind: 'unknown', reference: '' });
  });

  it('ne confond jamais une panne serveur avec une erreur réseau', () => {
    const panne = classifyLoginFailure({ message: 'Database error querying schema', status: 500 });
    const reseau = classifyLoginFailure({ message: 'Failed to fetch' });
    expect(panne.kind).not.toBe(reseau.kind);
  });
});
