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
/**
 * Notes publiées d'un enfant, avec la mention d'une lecture tronquée.
 *
 * La limite de lignes évite de charger un historique illimité. Quand elle est
 * atteinte, la moyenne affichée ne porterait que sur une partie des notes :
 * le résultat doit le dire, sinon l'interface affiche un chiffre faux comme
 * s'il était complet.
 */
export interface ChildGradesResult {
  grades: ParentGrade[];
  /** La lecture a atteint la limite : la moyenne est partielle. */
  truncated: boolean;
}

async function readChildGrades(
  studentId: string,
  limit: number,
): Promise<ChildGradesResult> {
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

  const grades = filterPublishedGrades((data ?? []).map(mapGradeRow));

  // La lecture est tronquée si la base a rendu autant de lignes que la limite.
  // On en lit une de plus pour distinguer « exactement la limite » de
  // « davantage de lignes que la limite ».
  return { grades, truncated: (data ?? []).length >= limit };
}

export const getChildGrades = cache(readChildGrades);
