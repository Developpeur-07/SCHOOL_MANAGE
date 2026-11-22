import { describe, expect, it } from 'vitest';
import {
  APP_ROLES,
  canAccessArea,
  getRoleArea,
  getRoleHomePath,
  isAppRole,
  isSuperAdmin,
  parseAppRole,
  type AppRole,
  type RoleArea,
} from './roles';

const expectations: Array<[AppRole, RoleArea, string]> = [
  ['parent', 'parent', '/parent'],
  ['direction', 'school', '/ecole'],
  ['secretary', 'school', '/ecole'],
  ['accountant', 'school', '/ecole'],
  ['teacher', 'teacher', '/enseignant'],
  ['supervisor', 'teacher', '/enseignant'],
  ['super_admin', 'admin', '/supervision'],
];

describe('redirections et zones des rôles', () => {
  it.each(expectations)(
    '%s est limité à %s et redirigé vers %s',
    (role, area, homePath) => {
      expect(getRoleArea(role)).toBe(area);
      expect(getRoleHomePath(role)).toBe(homePath);
      expect(canAccessArea(role, area)).toBe(true);

      for (const otherArea of ['parent', 'school', 'teacher', 'admin'] as const) {
        expect(canAccessArea(role, otherArea)).toBe(otherArea === area);
      }
    },
  );

  it('teste la validité d’un rôle sans lever d’erreur', () => {
    for (const role of APP_ROLES) expect(isAppRole(role)).toBe(true);

    // Une valeur venue de la base peut être absente de l'enum : elle doit
    // être rejetée sans faire tomber la lecture entière.
    expect(isAppRole('tresorier')).toBe(false);
    expect(isAppRole('')).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(42)).toBe(false);
  });

  it('accepte exactement les sept rôles du schéma', () => {
    expect(APP_ROLES).toHaveLength(7);
    for (const role of APP_ROLES) expect(parseAppRole(role)).toBe(role);
  });

  it('réserve la zone de supervision au seul rôle super_admin', () => {
    expect(isSuperAdmin('super_admin')).toBe(true);
    for (const role of APP_ROLES.filter((candidate) => candidate !== 'super_admin')) {
      expect(isSuperAdmin(role)).toBe(false);
    }
  });

  it.each([null, undefined, '', 'admin', 'PARENT', 42])(
    'refuse un rôle inconnu : %s',
    (role) => {
      expect(() => parseAppRole(role)).toThrow('APP_ROLE_INVALID');
    },
  );
});
