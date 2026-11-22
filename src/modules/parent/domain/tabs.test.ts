import { describe, expect, it } from 'vitest';
import { getParentTabHref, getParentTabIdFromPath, PARENT_TABS } from './tabs';

const studentId = '11000000-0000-4000-8000-000000000001';

describe('PARENT_TABS', () => {
  it('expose les cinq destinations attendues', () => {
    expect(PARENT_TABS.map((tab) => tab.id)).toEqual([
      'resume',
      'resultats',
      'vie-scolaire',
      'paiements',
      'infos',
    ]);
  });
});

describe('getParentTabHref', () => {
  it('construit les liens de l’espace enfant', () => {
    expect(getParentTabHref(studentId, 'resume')).toBe(`/parent/${studentId}`);
    expect(getParentTabHref(studentId, 'resultats')).toBe(`/parent/${studentId}/resultats`);
    expect(getParentTabHref(studentId, 'vie-scolaire')).toBe(
      `/parent/${studentId}/vie-scolaire`,
    );
    expect(getParentTabHref(studentId, 'paiements')).toBe(`/parent/${studentId}/paiements`);
    expect(getParentTabHref(studentId, 'infos')).toBe(`/parent/${studentId}/infos`);
  });

  it('échappe l’identifiant de l’enfant', () => {
    expect(getParentTabHref('a b/c', 'resultats')).toBe('/parent/a%20b%2Fc/resultats');
  });
});

describe('getParentTabIdFromPath', () => {
  it('reconnaît l’onglet courant', () => {
    expect(getParentTabIdFromPath(`/parent/${studentId}`)).toBe('resume');
    expect(getParentTabIdFromPath(`/parent/${studentId}/resultats`)).toBe('resultats');
    expect(getParentTabIdFromPath(`/parent/${studentId}/vie-scolaire`)).toBe('vie-scolaire');
    expect(getParentTabIdFromPath(`/parent/${studentId}/paiements`)).toBe('paiements');
    expect(getParentTabIdFromPath(`/parent/${studentId}/infos`)).toBe('infos');
  });

  it('renvoie null pour une URL hors de l’espace parent', () => {
    expect(getParentTabIdFromPath('/connexion')).toBeNull();
    expect(getParentTabIdFromPath('/parent')).toBeNull();
    expect(getParentTabIdFromPath(`/parent/${studentId}/inconnu`)).toBeNull();
  });
});
