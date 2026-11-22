import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { mapAttendanceRow, type ParentAttendance } from '../domain/attendance';

/**
 * Presences d'un enfant, avec la mention d'une lecture tronquee.
 *
 * Comme pour les notes, le taux de presence calcule sur une lecture
 * tronquee ne doit pas etre presente comme un taux complet.
 */
export interface ChildAttendanceResult {
  attendance: ParentAttendance[];
  /** La lecture a atteint la limite : le taux de presence est partiel. */
  truncated: boolean;
}

async function readChildAttendance(
  studentId: string,
  limit: number,
): Promise<ChildAttendanceResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('attendance')
    .select('id, attendance_date, status, comment')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error('ATTENDANCE_UNAVAILABLE');

  return {
    attendance: (data ?? []).map(mapAttendanceRow),
    truncated: (data ?? []).length >= limit,
  };
}

export const getChildAttendance = cache(readChildAttendance);
