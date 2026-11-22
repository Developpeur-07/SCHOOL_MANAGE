import { describe, expect, it } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  isMeasurementAllowed,
  isMeasurablePath,
  listMeasurablePaths,
  parseConsentDecision,
} from './consent';

describe('parseConsentDecision', () => {
  it('reconnaît une décision explicite', () => {
    expect(parseConsentDecision('granted')).toBe('granted');
    expect(parseConsentDecision('denied')).toBe('denied');
  });

  it('refuse toute valeur inattendue', () => {
    expect(parseConsentDecision('oui')).toBeNull();
    expect(parseConsentDecision('')).toBeNull();
    expect(parseConsentDecision(null)).toBeNull();
    expect(parseConsentDecision(undefined)).toBeNull();
    expect(parseConsentDecision(42)).toBeNull();
    expect(parseConsentDecision({})).toBeNull();
  });
});

describe('isMeasurementAllowed', () => {
  it('n’autorise la mesure qu’après un accord', () => {
    expect(isMeasurementAllowed('granted')).toBe(true);
  });

  it('l’interdit en cas de refus ou d’absence de décision', () => {
    expect(isMeasurementAllowed('denied')).toBe(false);
    expect(isMeasurementAllowed(null)).toBe(false);
  });
});

describe('isMeasurablePath', () => {
  it('accepte les pages publiques listées', () => {
    for (const chemin of listMeasurablePaths()) {
      expect(isMeasurablePath(chemin)).toBe(true);
    }
  });

  it('refuse toute page non listée', () => {
    expect(isMeasurablePath('/parent/11000000-0000-4000-8000-000000000001')).toBe(false);
    expect(isMeasurablePath('/compte')).toBe(false);
    expect(isMeasurablePath('/api/measure')).toBe(false);
  });

  it('refuse les sous-chemins et les chaînes de requête', () => {
    expect(isMeasurablePath('/connexion?origine=bandeau')).toBe(false);
    expect(isMeasurablePath('/confidentialite#cookies')).toBe(false);
    expect(isMeasurablePath('/connexion/particulier')).toBe(false);
  });

  it('ne mesure jamais une page située derrière une authentification', () => {
    for (const chemin of listMeasurablePaths()) {
      expect(chemin.startsWith('/parent')).toBe(false);
      expect(chemin.startsWith('/ecole')).toBe(false);
      expect(chemin.startsWith('/enseignant')).toBe(false);
      expect(chemin.startsWith('/supervision')).toBe(false);
    }
  });
});

describe('clé de stockage', () => {
  it('est stable et explicite', () => {
    expect(CONSENT_STORAGE_KEY).toBe('sm-audience-consent');
  });
});
