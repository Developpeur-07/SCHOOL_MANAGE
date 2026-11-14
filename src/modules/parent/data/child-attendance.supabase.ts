import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { mapAttendanceRow, type ParentAttendance } from '../domain/attendance';

async function readChildAttendance(
  studentId: string,
  limit: number,
): Promise<ParentAttendance[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('attendance')
    .select('id, attendance_date, status, comment')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error('ATTENDANCE_UNAVAILABLE');

  return (data ?? []).map(mapAttendanceRow);
}

export const getChildAttendance = cache(readChildAttendance);
