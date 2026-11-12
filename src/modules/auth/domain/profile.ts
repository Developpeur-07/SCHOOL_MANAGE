import { isSuperAdmin, parseAppRole, type AppRole } from './roles';

export interface UserProfile {
  id: string;
  /**
   * École de rattachement.
   *
   * `null` pour le rôle de supervision globale, qui n’appartient à aucune
   * école : c’est la RLS, et non l’interface, qui garantit qu’aucun autre
   * rôle ne peut lire les données d’une autre école.
   */
  schoolId: string | null;
  schoolName: string | null;
  /** Devise de l’école, utilisée pour formater les montants. */
  schoolCurrency: string;
  /** Locale de l’école, utilisée pour formater les dates. */
  schoolLocale: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
}

interface ProfileRow {
  id: unknown;
  school_id: unknown;
  full_name: unknown;
  role: unknown;
  is_active: unknown;
  schools: unknown;
}

function readSchool(value: unknown): {
  name: string | null;
  currency: string | null;
  locale: string | null;
} {
  const school = Array.isArray(value) ? value[0] : value;

  if (!school || typeof school !== 'object') {
    return { name: null, currency: null, locale: null };
  }

  const name =
    'name' in school && typeof school.name === 'string' ? school.name : null;
  const currency =
    'currency_code' in school && typeof school.currency_code === 'string'
      ? school.currency_code
      : null;
  const locale =
    'locale' in school && typeof school.locale === 'string' ? school.locale : null;

  return { name, currency, locale };
}

export function mapProfileRow(row: unknown): UserProfile | null {
  if (row === null || row === undefined) return null;
  if (typeof row !== 'object') throw new Error('PROFILE_ROW_INVALID');

  const candidate = row as ProfileRow;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.full_name !== 'string' ||
    typeof candidate.is_active !== 'boolean'
  ) {
    throw new Error('PROFILE_ROW_INVALID');
  }

  const role = parseAppRole(candidate.role);

  // Le rôle de supervision globale n’est rattaché à aucune école : son
  // `school_id` peut donc être absent. Tout autre rôle exige une école.
  const schoolId = readSchoolId(candidate.school_id, role);

  const school = readSchool(candidate.schools);

  return {
    id: candidate.id,
    schoolId,
    schoolName: school.name,
    schoolCurrency: school.currency ?? 'XAF',
    schoolLocale: school.locale ?? 'fr-CG',
    fullName: candidate.full_name,
    role,
    isActive: candidate.is_active,
  };
}

function readSchoolId(value: unknown, role: AppRole): string | null {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) {
    if (isSuperAdmin(role)) return null;
    throw new Error('PROFILE_ROW_INVALID');
  }

  throw new Error('PROFILE_ROW_INVALID');
}
