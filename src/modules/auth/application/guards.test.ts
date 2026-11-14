import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../domain/profile';

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('../data/current-profile', () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

import { requireActiveProfile, requireArea } from './guards';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'a0000000-0000-4000-8000-000000000010',
    schoolId: '10000000-0000-4000-8000-000000000001',
    schoolName: 'École entièrement fictive A',
    schoolCurrency: 'XAF',
    schoolLocale: 'fr-CG',
    fullName: 'Parent Démo A1',
    role: 'parent',
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getCurrentProfile.mockReset();
  mocks.redirect.mockClear();
});

describe('requireActiveProfile', () => {
  it('redirige un visiteur sans session vers la connexion', async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    await expect(requireActiveProfile()).rejects.toThrow('NEXT_REDIRECT:/connexion');
  });

  it('bloque un compte désactivé sans ouvrir un espace métier', async () => {
    mocks.getCurrentProfile.mockResolvedValue(makeProfile({ isActive: false }));
    await expect(requireActiveProfile()).rejects.toThrow('NEXT_REDIRECT:/compte-desactive');
  });

  it('retourne un profil actif', async () => {
    const profile = makeProfile();
    mocks.getCurrentProfile.mockResolvedValue(profile);
    await expect(requireActiveProfile()).resolves.toEqual(profile);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe('requireArea', () => {
  it('redirige un parent qui tente le portail école vers son propre espace', async () => {
    mocks.getCurrentProfile.mockResolvedValue(makeProfile({ role: 'parent' }));
    await expect(requireArea('school')).rejects.toThrow('NEXT_REDIRECT:/parent');
  });

  it('redirige un enseignant qui tente l’espace parent', async () => {
    mocks.getCurrentProfile.mockResolvedValue(makeProfile({ role: 'teacher' }));
    await expect(requireArea('parent')).rejects.toThrow('NEXT_REDIRECT:/enseignant');
  });

  it('autorise les trois rôles du portail école', async () => {
    for (const role of ['direction', 'secretary', 'accountant'] as const) {
      const profile = makeProfile({ role });
      mocks.getCurrentProfile.mockResolvedValue(profile);
      await expect(requireArea('school')).resolves.toEqual(profile);
    }
  });

  it('autorise enseignant et surveillant dans leur espace', async () => {
    for (const role of ['teacher', 'supervisor'] as const) {
      const profile = makeProfile({ role });
      mocks.getCurrentProfile.mockResolvedValue(profile);
      await expect(requireArea('teacher')).resolves.toEqual(profile);
    }
  });
});
