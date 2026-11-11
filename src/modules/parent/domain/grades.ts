/**
 * Lecture des notes publiées d’un enfant (lecture seule côté parent).
 *
 * Le mapping est volontairement strict : une ligne inattendue lève une erreur
 * explicite plutôt que d’afficher une donnée partielle ou trompeuse.
 */

export interface ParentGrade {
  id: string;
  subjectName: string;
  periodName: string;
  evaluationLabel: string;
  score: number;
  maxScore: number;
  /** Pourcentage arrondi à une décimale, compris entre 0 et 100. */
  percentage: number;
  publishedAt: string | null;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`GRADE_ROW_INVALID_${field}`);
  }
  return value;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`GRADE_ROW_INVALID_${field}`);
  }
  return value;
}

/** PostgREST renvoie une relation imbriquée sous forme d’objet ou de tableau. */
export function readEmbeddedName(value: unknown, field: string): string {
  const relation = Array.isArray(value) ? value[0] : value;

  if (
    !relation ||
    typeof relation !== 'object' ||
    !('name' in relation) ||
    typeof relation.name !== 'string' ||
    relation.name.length === 0
  ) {
    throw new Error(`GRADE_ROW_INVALID_${field}`);
  }

  return relation.name;
}

export function computePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) throw new Error('GRADE_MAX_SCORE_INVALID');
  const percentage = (score / maxScore) * 100;
  return Math.round(percentage * 10) / 10;
}

export function mapGradeRow(row: unknown): ParentGrade {
  if (!row || typeof row !== 'object') throw new Error('GRADE_ROW_INVALID');

  const grade = row as Record<string, unknown>;

  if (!('id' in grade) || !('score' in grade) || !('max_score' in grade)) {
    throw new Error('GRADE_ROW_INVALID');
  }

  const score = readNumber(grade.score, 'SCORE');
  const maxScore = readNumber(grade.max_score, 'MAX_SCORE');

  if (maxScore <= 0 || score < 0 || score > maxScore) {
    throw new Error('GRADE_ROW_INVALID_RANGE');
  }

  const publishedAt =
    'published_at' in grade && typeof grade.published_at === 'string'
      ? grade.published_at
      : null;

  return {
    id: readString(grade.id, 'ID'),
    subjectName: readEmbeddedName(grade.subject, 'SUBJECT'),
    periodName: readEmbeddedName(grade.period, 'PERIOD'),
    evaluationLabel: readString(grade.evaluation_label, 'EVALUATION_LABEL'),
    score,
    maxScore,
    percentage: computePercentage(score, maxScore),
    publishedAt,
  };
}

/**
 * Ne conserve que les notes effectivement publiées.
 *
 * La RLS réserve déjà les notes publiées aux parents, mais l’interface
 * applique ce filtre une seconde fois : une évolution de politique ne peut
 * pas exposer un brouillon dans l’espace parent.
 */
export function filterPublishedGrades(grades: ParentGrade[]): ParentGrade[] {
  return grades.filter((grade) => typeof grade.publishedAt === 'string' && grade.publishedAt.length > 0);
}

/**
 * Moyenne pondérée par le barème, exprimée en pourcentage et arrondie à une
 * décimale. Les notes ayant des barèmes différents (sur 10, sur 20, sur 50),
 * seul un ratio comparable est affiché.
 */
export function computeAveragePercentage(grades: ParentGrade[]): number | null {
  const total = grades.reduce(
    (accumulator, grade) => ({
      max: accumulator.max + grade.maxScore,
      score: accumulator.score + grade.score,
    }),
    { max: 0, score: 0 },
  );

  if (total.max === 0) return null;
  return Math.round((total.score / total.max) * 1000) / 10;
}

/** Regroupe les notes par matière, dans l’ordre d’apparition. */
export function groupGradesBySubject(
  grades: ParentGrade[],
): Array<{ subjectName: string; grades: ParentGrade[]; average: number | null }> {
  const groups = new Map<string, ParentGrade[]>();

  for (const grade of grades) {
    const bucket = groups.get(grade.subjectName);
    if (bucket) bucket.push(grade);
    else groups.set(grade.subjectName, [grade]);
  }

  return Array.from(groups.entries()).map(([subjectName, subjectGrades]) => ({
    subjectName,
    grades: subjectGrades,
    average: computeAveragePercentage(subjectGrades),
  }));
}
