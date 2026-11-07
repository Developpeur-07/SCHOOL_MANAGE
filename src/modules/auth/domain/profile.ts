import { parseAppRole, type AppRole } from './roles';

export interface UserProfile {
  id: string;
  schoolId: string;
  schoolName: string | null;
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

function readSchoolName(value: unknown): string | null {
  const school = Array.isArray(value) ? value[0] : value;
  if (
    school &&
    typeof school === 'object' &&
    'name' in school &&
    typeof school.name === 'string'
  ) {
    return school.name;
  }
  return null;
}

export function mapProfileRow(row: unknown): UserProfile | null {
  if (row === null || row === undefined) return null;
  if (typeof row !== 'object') throw new Error('PROFILE_ROW_INVALID');

  const candidate = row as ProfileRow;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.school_id !== 'string' ||
    typeof candidate.full_name !== 'string' ||
    typeof candidate.is_active !== 'boolean'
  ) {
    throw new Error('PROFILE_ROW_INVALID');
  }

  return {
    id: candidate.id,
    schoolId: candidate.school_id,
    schoolName: readSchoolName(candidate.schools),
    fullName: candidate.full_name,
    role: parseAppRole(candidate.role),
    isActive: candidate.is_active,
  };
}
