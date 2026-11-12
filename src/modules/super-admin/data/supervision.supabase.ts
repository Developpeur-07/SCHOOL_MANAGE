import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import {
  buildSupervisionOverview,
  type SupervisionAnnouncementRow,
  type SupervisionAttendanceRow,
  type SupervisionClassRow,
  type SupervisionFeeRow,
  type SupervisionGradeRow,
  type SupervisionInput,
  type SupervisionNotificationRow,
  type SupervisionOverview,
  type SupervisionPaymentRow,
  type SupervisionProfileRow,
  type SupervisionSchoolRow,
  type SupervisionStudentRow,
} from '../domain/overview';

/**
 * Lecture de la supervision globale.
 *
 * Toutes les lectures passent par le client serveur authentifié : la RLS
 * décide de ce qui est visible. Un profil qui n'a pas le rôle de supervision
 * ne voit aucune ligne de ce module (les politiques RLS du rôle super-admin
 * s'appliquent à toutes les tables lues ici).
 */

/**
 * Plafond de lignes lues par table.
 *
 * La supervision agrège des volumes schools ; ce plafond évite de charger
 * indéfiniment la mémoire du serveur. Quand il est atteint, la vue est
 * signalée comme partielle plutôt que présentée comme exhaustive.
 */
export const SUPERVISION_ROW_LIMIT = 10_000;

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`SUPERVISION_ROW_INVALID_${field}`);
  }
  return value;
}

function readOptionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return readString(value, field);
}

function readCount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`SUPERVISION_ROW_INVALID_${field}`);
  }
  return value;
}

function readStatus(value: unknown, field: string): 'draft' | 'published' {
  if (value === 'draft' || value === 'published') return value;
  throw new Error(`SUPERVISION_ROW_INVALID_${field}`);
}

function mapSchoolRow(row: unknown): SupervisionSchoolRow {
  const school = row as Record<string, unknown>;
  return {
    id: readString(school.id, 'ID'),
    name: readString(school.name, 'NAME'),
    currencyCode: readString(school.currency_code, 'CURRENCY_CODE'),
    locale: readString(school.locale, 'LOCALE'),
  };
}

function mapProfileRow(row: unknown): SupervisionProfileRow {
  const profile = row as Record<string, unknown>;
  const role = profile.role;
  if (typeof role !== 'string') throw new Error('SUPERVISION_ROW_INVALID_ROLE');

  return {
    schoolId: readOptionalString(profile.school_id, 'SCHOOL_ID'),
    role: role as SupervisionProfileRow['role'],
    isActive: profile.is_active === true,
  };
}

function mapClassRow(row: unknown): SupervisionClassRow {
  const record = row as Record<string, unknown>;
  return { schoolId: readString(record.school_id, 'SCHOOL_ID') };
}

function mapStudentRow(row: unknown): SupervisionStudentRow {
  const record = row as Record<string, unknown>;
  return { schoolId: readString(record.school_id, 'SCHOOL_ID') };
}

function mapGradeRow(row: unknown): SupervisionGradeRow {
  const record = row as Record<string, unknown>;
  return {
    schoolId: readString(record.school_id, 'SCHOOL_ID'),
    status: readStatus(record.status, 'STATUS'),
  };
}

function mapAttendanceRow(row: unknown): SupervisionAttendanceRow {
  const record = row as Record<string, unknown>;
  return { schoolId: readString(record.school_id, 'SCHOOL_ID') };
}

function mapFeeRow(row: unknown): SupervisionFeeRow {
  const record = row as Record<string, unknown>;
  return {
    id: readString(record.id, 'ID'),
    schoolId: readString(record.school_id, 'SCHOOL_ID'),
    amountMinor: readCount(record.amount_minor, 'AMOUNT_MINOR'),
    dueOn: readString(record.due_on, 'DUE_ON'),
  };
}

function mapPaymentRow(row: unknown): SupervisionPaymentRow {
  const record = row as Record<string, unknown>;
  return {
    id: readString(record.id, 'ID'),
    schoolId: readString(record.school_id, 'SCHOOL_ID'),
    feeId: readOptionalString(record.fee_id, 'FEE_ID'),
    amountMinor: readCount(record.amount_minor, 'AMOUNT_MINOR'),
  };
}

function mapAnnouncementRow(row: unknown): SupervisionAnnouncementRow {
  const record = row as Record<string, unknown>;
  return {
    schoolId: readString(record.school_id, 'SCHOOL_ID'),
    status: readStatus(record.status, 'STATUS'),
  };
}

function mapNotificationRow(row: unknown): SupervisionNotificationRow {
  const record = row as Record<string, unknown>;
  return { schoolId: readString(record.school_id, 'SCHOOL_ID') };
}

async function readSupervisionOverview(): Promise<SupervisionOverview> {
  const supabase = await createSupabaseServerClient();
  const limit = SUPERVISION_ROW_LIMIT;

  const [
    schoolsResult,
    profilesResult,
    classesResult,
    studentsResult,
    gradesResult,
    attendanceResult,
    feesResult,
    paymentsResult,
    announcementsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from('schools').select('id, name, currency_code, locale').limit(limit),
    supabase.from('profiles').select('school_id, role, is_active').limit(limit),
    supabase.from('classes').select('school_id').limit(limit),
    supabase.from('students').select('school_id').limit(limit),
    supabase.from('grades').select('school_id, status').limit(limit),
    supabase.from('attendance').select('school_id').limit(limit),
    supabase.from('fees').select('id, school_id, amount_minor, due_on').limit(limit),
    supabase.from('payments').select('id, school_id, fee_id, amount_minor').limit(limit),
    supabase.from('announcements').select('school_id, status').limit(limit),
    supabase.from('notifications').select('school_id').limit(limit),
  ]);

  const results = [
    schoolsResult,
    profilesResult,
    classesResult,
    studentsResult,
    gradesResult,
    attendanceResult,
    feesResult,
    paymentsResult,
    announcementsResult,
    notificationsResult,
  ];

  for (const result of results) {
    if (result.error) throw new Error('SUPERVISION_DATA_UNAVAILABLE');
  }

  const input: SupervisionInput = {
    schools: (schoolsResult.data ?? []).map(mapSchoolRow),
    profiles: (profilesResult.data ?? []).map(mapProfileRow),
    classes: (classesResult.data ?? []).map(mapClassRow),
    students: (studentsResult.data ?? []).map(mapStudentRow),
    grades: (gradesResult.data ?? []).map(mapGradeRow),
    attendance: (attendanceResult.data ?? []).map(mapAttendanceRow),
    fees: (feesResult.data ?? []).map(mapFeeRow),
    payments: (paymentsResult.data ?? []).map(mapPaymentRow),
    announcements: (announcementsResult.data ?? []).map(mapAnnouncementRow),
    notifications: (notificationsResult.data ?? []).map(mapNotificationRow),
  };

  // Une lecture qui atteint la limite signifie que l'agrégat est partiel :
  // la vue le signale au lieu de se présenter comme exhaustive.
  const truncated = results.some((result) => (result.data ?? []).length >= limit);

  const today = new Date().toISOString().slice(0, 10);
  return buildSupervisionOverview(input, today, truncated);
}

// Dédoublonne les lectures de la page de supervision et de son squelette.
export const getSupervisionOverview = cache(readSupervisionOverview);
