import { describe, expect, it } from 'vitest';
import { mapProfileRow } from './profile';

const baseRow = {
  id: 'a0000000-0000-4000-8000-000000000010',
  school_id: '10000000-0000-4000-8000-000000000001',
  full_name: 'Parent Démo A1',
  role: 'parent',
  is_active: true,
  schools: {
    name: 'École entièrement fictive A',
    currency_code: 'XAF',
    locale: 'fr-CG',
  },
};

describe('mapProfileRow', () => {
  it('mappe le profil, son école, sa devise et sa locale', () => {
    expect(mapProfileRow(baseRow)).toEqual({
      id: baseRow.id,
      schoolId: baseRow.school_id,
      schoolName: 'École entièrement fictive A',
      schoolCurrency: 'XAF',
      schoolLocale: 'fr-CG',
      fullName: baseRow.full_name,
      role: 'parent',
      isActive: true,
    });
  });

  it('accepte une relation PostgREST sous forme de tableau', () => {
    const profile = mapProfileRow({
      ...baseRow,
      role: 'direction',
      schools: [{ name: 'École fictive', currency_code: 'EUR', locale: 'fr-FR' }],
    });
    expect(profile?.role).toBe('direction');
    expect(profile?.schoolName).toBe('École fictive');
    expect(profile?.schoolCurrency).toBe('EUR');
    expect(profile?.schoolLocale).toBe('fr-FR');
  });

  it('reprend des valeurs par défaut si l’école n’est pas renseignée', () => {
    const profile = mapProfileRow({ ...baseRow, schools: null });
    expect(profile?.schoolName).toBeNull();
    expect(profile?.schoolCurrency).toBe('XAF');
    expect(profile?.schoolLocale).toBe('fr-CG');
  });

  it('conserve un profil inactif pour afficher le bon état de compte', () => {
    expect(mapProfileRow({ ...baseRow, is_active: false })?.isActive).toBe(false);
  });

  it('retourne null sans profil, mais refuse une ligne malformée', () => {
    expect(mapProfileRow(null)).toBeNull();
    expect(() => mapProfileRow({ ...baseRow, id: 42 })).toThrow('PROFILE_ROW_INVALID');
    expect(() => mapProfileRow({ ...baseRow, role: 'admin' })).toThrow('APP_ROLE_INVALID');
  });
});
