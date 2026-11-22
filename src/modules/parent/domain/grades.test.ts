import { describe, expect, it } from 'vitest';
import {
  computeAverageOnTwenty,
  convertNoteToOutOfTwenty,
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
      noteOutOfTwenty: 14.5,
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

describe('convertNoteToOutOfTwenty', () => {
  it('conserve une note déjà sur 20', () => {
    expect(convertNoteToOutOfTwenty(14.5, 20)).toBe(14.5);
    expect(convertNoteToOutOfTwenty(0, 20)).toBe(0);
    expect(convertNoteToOutOfTwenty(20, 20)).toBe(20);
  });

  it('ramène une note sur 10 ou sur 50 sur l’échelle de 20', () => {
    expect(convertNoteToOutOfTwenty(8, 10)).toBe(16);
    expect(convertNoteToOutOfTwenty(45, 50)).toBe(18);
    expect(convertNoteToOutOfTwenty(1, 3)).toBe(6.7);
  });

  it('refuse un barème nul ou une note hors barème', () => {
    expect(() => convertNoteToOutOfTwenty(1, 0)).toThrow('GRADE_MAX_SCORE_INVALID');
    expect(() => convertNoteToOutOfTwenty(21, 20)).toThrow('GRADE_MAX_SCORE_INVALID_RANGE');
  });
});

const buildGrade = (overrides: Partial<ParentGrade>): ParentGrade => ({
  id: 'id',
  subjectName: 'Mathématiques',
  periodName: 'Trimestre 1',
  evaluationLabel: 'Évaluation',
  score: 10,
  maxScore: 20,
  noteOutOfTwenty: 10,
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

describe('computeAverageOnTwenty', () => {
  it('calcule la moyenne générale sur 20', () => {
    const average = computeAverageOnTwenty([
      buildGrade({ score: 14.5, maxScore: 20, noteOutOfTwenty: 14.5 }),
      buildGrade({ score: 12, maxScore: 20, noteOutOfTwenty: 12 }),
      buildGrade({ score: 16, maxScore: 20, noteOutOfTwenty: 16 }),
    ]);
    expect(average).toBe(14.2);
  });

  it('ramène sur 20 les évaluations de barèmes différents', () => {
    const average = computeAverageOnTwenty([
      buildGrade({ score: 14.5, maxScore: 20, noteOutOfTwenty: 14.5 }),
      buildGrade({ score: 8, maxScore: 10, noteOutOfTwenty: 16 }),
    ]);
    expect(average).toBe(15.3);
  });

  it('renvoie null sans note', () => {
    expect(computeAverageOnTwenty([])).toBeNull();
  });
});

describe('groupGradesBySubject', () => {
  it('regroupe par matière en conservant l’ordre d’arrivée', () => {
    const groups = groupGradesBySubject([
      buildGrade({ id: '1', subjectName: 'Mathématiques', score: 10, maxScore: 20, noteOutOfTwenty: 10 }),
      buildGrade({ id: '2', subjectName: 'Lecture', score: 15, maxScore: 20, noteOutOfTwenty: 15 }),
      buildGrade({ id: '3', subjectName: 'Mathématiques', score: 18, maxScore: 20, noteOutOfTwenty: 18 }),
    ]);

    expect(groups.map((group) => group.subjectName)).toEqual([
      'Mathématiques',
      'Lecture',
    ]);
    expect(groups[0].grades).toHaveLength(2);
    expect(groups[0].average).toBe(14);
  });
});
