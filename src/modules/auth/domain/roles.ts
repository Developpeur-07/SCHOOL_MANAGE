export const APP_ROLES = [
  'parent',
  'direction',
  'secretary',
  'accountant',
  'teacher',
  'supervisor',
  'super_admin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type RoleArea = 'parent' | 'school' | 'teacher' | 'admin';

const ROLE_AREAS: Record<AppRole, RoleArea> = {
  parent: 'parent',
  direction: 'school',
  secretary: 'school',
  accountant: 'school',
  teacher: 'teacher',
  supervisor: 'teacher',
  super_admin: 'admin',
};

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  parent: '/parent',
  direction: '/ecole',
  secretary: '/ecole',
  accountant: '/ecole',
  teacher: '/enseignant',
  supervisor: '/enseignant',
  super_admin: '/supervision',
};

export function parseAppRole(value: unknown): AppRole {
  if (typeof value === 'string' && APP_ROLES.includes(value as AppRole)) {
    return value as AppRole;
  }

  throw new Error('APP_ROLE_INVALID');
}

export function getRoleArea(role: AppRole): RoleArea {
  return ROLE_AREAS[role];
}

export function getRoleHomePath(role: AppRole): string {
  return ROLE_HOME_PATHS[role];
}

export function canAccessArea(role: AppRole, area: RoleArea): boolean {
  return getRoleArea(role) === area;
}

/**
 * Rôle de supervision globale.
 *
 * Ce rôle n’appartient à aucune école : il consulte l’ensemble des écoles
 * gérées par la plateforme. Toute autre valeur de rôle est refusée.
 */
export function isSuperAdmin(role: AppRole): boolean {
  return role === 'super_admin';
}
