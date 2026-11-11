import { describe, expect, it } from 'vitest';
import {
  computePercentage,
  computeAveragePercentage,
  filterPublishedGrades,
  groupGradesBySubject,
  mapGradeRow,
  type ParentGrade,
} from './grades';

const row = {
  id: '16000000-0000-4000-8000-000000000001',
  evaluation_label: 'Devoir fictif A1',
  score: 14.5,
  max_score: 20,
  published_at: '2026-11-02T08:00:00Z',
  subject: { name: 'Mathématiques' },
  period: { name: 'Trimestre 1' },
};

describe('mapGradeRow', () => {
  it('mappe une note publiée', () => {
    expect(mapGradeRow(row)).toEqual({
      id: row.id,
      subjectName: 'Mathématiques',
      periodName: 'Trimestre 1',
      evaluationLabel: 'Devoir fictif A1',
      score: 14.5,
      maxScore: 20,
      percentage: 72.5,
      publishedAt: '2026-11-02T08:00:00Z',
    });
  });

  it('accepte les relations PostgREST sous forme de tableau', () => {
    const grade = mapGradeRow({
      ...row,
      subject: [{ name: 'Lecture' }],
      period: [{ name: 'Trimestre 2' }],
    });
    expect(grade.subjectName).toBe('Lecture');
    expect(grade.periodName).toBe('Trimestre 2');
  });

  it('accepte une note sans date de publication', () => {
    expect(mapGradeRow({ ...row, published_at: null }).publishedAt).toBeNull();
  });

  it('refuse une ligne incomplète ou incohérente', () => {
    expect(() => mapGradeRow(null)).toThrow('GRADE_ROW_INVALID');
    expect(() => mapGradeRow({ ...row, subject: undefined })).toThrow(
      'GRADE_ROW_INVALID_SUBJECT',
    );
    expect(() => mapGradeRow({ ...row, max_score: 0 })).toThrow('GRADE_ROW_INVALID_RANGE');
    expect(() => mapGradeRow({ ...row, score: 25 })).toThrow('GRADE_ROW_INVALID_RANGE');
    expect(() => mapGradeRow({ ...row, score: '14' })).toThrow('GRADE_ROW_INVALID_SCORE');
  });
});

describe('computePercentage', () => {
  it('arrondit à une décimale', () => {
    expect(computePercentage(14.5, 20)).toBe(72.5);
    expect(computePercentage(1, 3)).toBe(33.3);
    expect(computePercentage(0, 20)).toBe(0);
    expect(computePercentage(20, 20)).toBe(100);
  });

  it('refuse un barème nul', () => {
    expect(() => computePercentage(1, 0)).toThrow('GRADE_MAX_SCORE_INVALID');
  });
});

const buildGrade = (overrides: Partial<ParentGrade>): ParentGrade => ({
  id: 'id',
  subjectName: 'Mathématiques',
  periodName: 'Trimestre 1',
  evaluationLabel: 'Évaluation',
  score: 10,
  maxScore: 20,
  percentage: 50,
  publishedAt: null,
  ...overrides,
});

describe('filterPublishedGrades', () => {
  it('écarte les notes sans date de publication', () => {
    const published = mapGradeRow(row);
    const draft = mapGradeRow({ ...row, id: 'draft', published_at: null });

    expect(filterPublishedGrades([published, draft])).toEqual([published]);
  });

  it('conserve une liste vide sans erreur', () => {
    expect(filterPublishedGrades([])).toEqual([]);
  });
});

describe('computeAveragePercentage', () => {
  it('pondère par le barème et exprime le résultat en pourcentage', () => {
    const average = computeAveragePercentage([
      buildGrade({ score: 10, maxScore: 20 }),
      buildGrade({ score: 18, maxScore: 20 }),
      buildGrade({ score: 45, maxScore: 50 }),
    ]);
    expect(average).toBe(81.1);
  });

  it('renvoie null sans note', () => {
    expect(computeAveragePercentage([])).toBeNull();
  });
});

describe('groupGradesBySubject', () => {
  it('regroupe par matière en conservant l’ordre d’arrivée', () => {
    const groups = groupGradesBySubject([
      buildGrade({ id: '1', subjectName: 'Mathématiques', score: 10, maxScore: 20 }),
      buildGrade({ id: '2', subjectName: 'Lecture', score: 15, maxScore: 20 }),
      buildGrade({ id: '3', subjectName: 'Mathématiques', score: 18, maxScore: 20 }),
    ]);

    expect(groups.map((group) => group.subjectName)).toEqual([
      'Mathématiques',
      'Lecture',
    ]);
    expect(groups[0].grades).toHaveLength(2);
    expect(groups[0].average).toBe(70);
  });
});
