import { describe, expect, it } from 'vitest';
import {
  APP_ROLES,
  canAccessArea,
  getRoleArea,
  getRoleHomePath,
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
];

describe('redirections et zones des rôles', () => {
  it.each(expectations)(
    '%s est limité à %s et redirigé vers %s',
    (role, area, homePath) => {
      expect(getRoleArea(role)).toBe(area);
      expect(getRoleHomePath(role)).toBe(homePath);
      expect(canAccessArea(role, area)).toBe(true);

      for (const otherArea of ['parent', 'school', 'teacher'] as const) {
        expect(canAccessArea(role, otherArea)).toBe(otherArea === area);
      }
    },
  );

  it('accepte exactement les six rôles du schéma', () => {
    expect(APP_ROLES).toHaveLength(6);
    for (const role of APP_ROLES) expect(parseAppRole(role)).toBe(role);
  });

  it.each([null, undefined, '', 'admin', 'PARENT', 42])(
    'refuse un rôle inconnu : %s',
    (role) => {
      expect(() => parseAppRole(role)).toThrow('APP_ROLE_INVALID');
    },
  );
});
