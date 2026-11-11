/**
 * Lecture des présences d’un enfant (lecture seule côté parent).
 */

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface ParentAttendance {
  id: string;
  /** Date scolaire au format ISO `AAAA-MM-JJ`. */
  date: string;
  status: AttendanceStatus;
  comment: string | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Part des jours présents, en pourcentage arrondi à une décimale. */
  presenceRate: number;
}

export function parseAttendanceStatus(value: unknown): AttendanceStatus {
  if (
    typeof value === 'string' &&
    (ATTENDANCE_STATUSES as readonly string[]).includes(value)
  ) {
    return value as AttendanceStatus;
  }
  throw new Error('ATTENDANCE_STATUS_INVALID');
}

export function mapAttendanceRow(row: unknown): ParentAttendance {
  if (!row || typeof row !== 'object') throw new Error('ATTENDANCE_ROW_INVALID');

  const record = row as Record<string, unknown>;

  if (!('id' in record) || !('attendance_date' in record) || !('status' in record)) {
    throw new Error('ATTENDANCE_ROW_INVALID');
  }

  const date = record.attendance_date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('ATTENDANCE_ROW_INVALID_DATE');
  }

  const comment =
    'comment' in record && typeof record.comment === 'string' && record.comment.length > 0
      ? record.comment
      : null;

  return {
    id: record.id as string,
    date,
    status: parseAttendanceStatus(record.status),
    comment,
  };
}

export function summarizeAttendance(records: ParentAttendance[]): AttendanceSummary {
  const counters: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const record of records) counters[record.status] += 1;

  const total = records.length;
  const presenceRate = total === 0 ? 0 : Math.round((counters.present / total) * 1000) / 10;

  return { total, ...counters, presenceRate };
}
