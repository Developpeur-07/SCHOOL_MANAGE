import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { filterPublishedGrades, mapGradeRow, type ParentGrade } from '../domain/grades';

/**
 * Notes publiées d’un enfant.
 *
 * La lecture passe par le client serveur authentifié : c’est la RLS qui
 * décide de ce qu’un parent voit (notes publiées de ses enfants liés). Aucune
 * condition n’est recalculée côté application.
 */
async function readChildGrades(studentId: string, limit: number): Promise<ParentGrade[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('grades')
    .select(
      `
        id,
        evaluation_label,
        score,
        max_score,
        published_at,
        subject:subjects!inner (name),
        period:periods!inner (name)
      `,
    )
    .eq('student_id', studentId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error('GRADES_UNAVAILABLE');

  return filterPublishedGrades((data ?? []).map(mapGradeRow));
}

export const getChildGrades = cache(readChildGrades);
