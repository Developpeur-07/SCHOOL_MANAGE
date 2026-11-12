import { describe, expect, it } from 'vitest';
import {
  buildSupervisionOverview,
  type SupervisionInput,
} from './overview';

const SCHOOL_A = '10000000-0000-4000-8000-000000000001';
const SCHOOL_B = '20000000-0000-4000-8000-000000000002';

function buildInput(overrides: Partial<SupervisionInput> = {}): SupervisionInput {
  return {
    schools: [
      { id: SCHOOL_A, name: 'École A', currencyCode: 'XAF', locale: 'fr-CG' },
      { id: SCHOOL_B, name: 'École B', currencyCode: 'EUR', locale: 'fr-FR' },
    ],
    profiles: [],
    classes: [],
    students: [],
    grades: [],
    attendance: [],
    fees: [],
    payments: [],
    announcements: [],
    notifications: [],
    ...overrides,
  };
}

describe('buildSupervisionOverview', () => {
  it('agrège les volumes par école', () => {
    const overview = buildSupervisionOverview(
      buildInput({
        profiles: [
          { schoolId: SCHOOL_A, role: 'direction', isActive: true },
          { schoolId: SCHOOL_A, role: 'teacher', isActive: true },
          { schoolId: SCHOOL_A, role: 'parent', isActive: true },
          { schoolId: SCHOOL_A, role: 'parent', isActive: false },
          { schoolId: SCHOOL_B, role: 'secretary', isActive: true },
          { schoolId: null, role: 'super_admin', isActive: true },
        ],
        classes: [{ schoolId: SCHOOL_A }, { schoolId: SCHOOL_A }, { schoolId: SCHOOL_B }],
        students: [{ schoolId: SCHOOL_A }, { schoolId: SCHOOL_B }],
        grades: [
          { schoolId: SCHOOL_A, status: 'published' },
          { schoolId: SCHOOL_A, status: 'published' },
          { schoolId: SCHOOL_A, status: 'draft' },
          { schoolId: SCHOOL_B, status: 'published' },
        ],
        attendance: [{ schoolId: SCHOOL_A }],
        announcements: [
          { schoolId: SCHOOL_A, status: 'published' },
          { schoolId: SCHOOL_A, status: 'draft' },
        ],
        notifications: [{ schoolId: SCHOOL_A }, { schoolId: SCHOOL_B }],
      }),
      '2026-11-07',
    );

    expect(overview.schools.map((school) => school.name)).toEqual([
      'École A',
      'École B',
    ]);

    const [ecoleA, ecoleB] = overview.schools;
    expect(ecoleA.staffCount).toBe(2);
    expect(ecoleA.parentsCount).toBe(1);
    expect(ecoleA.classesCount).toBe(2);
    expect(ecoleA.studentsCount).toBe(1);
    expect(ecoleA.publishedGradesCount).toBe(2);
    expect(ecoleA.draftGradesCount).toBe(1);
    expect(ecoleA.attendanceRecordsCount).toBe(1);
    expect(ecoleA.publishedAnnouncementsCount).toBe(1);
    expect(ecoleA.notificationsCount).toBe(1);

    expect(ecoleB.staffCount).toBe(1);
    expect(ecoleB.studentsCount).toBe(1);
    expect(ecoleB.publishedGradesCount).toBe(1);

    expect(overview.totals).toMatchObject({
      schoolsCount: 2,
      studentsCount: 2,
      staffCount: 3,
      parentsCount: 1,
      classesCount: 3,
      publishedGradesCount: 3,
      attendanceRecordsCount: 1,
      publishedAnnouncementsCount: 1,
      notificationsCount: 2,
    });

    // Le compte de supervision globale est compté, mais pas rattaché à une école.
    expect(overview.roles).toContainEqual({ role: 'super_admin', count: 1 });
    expect(overview.roles).toContainEqual({ role: 'parent', count: 1 });
  });

  it('déduit les impayés des paiements et compte les échéances dépassées', () => {
    const overview = buildSupervisionOverview(
      buildInput({
        fees: [
          { id: 'fee-1', schoolId: SCHOOL_A, amountMinor: 50_000, dueOn: '2026-11-01' },
          { id: 'fee-2', schoolId: SCHOOL_A, amountMinor: 30_000, dueOn: '2026-12-01' },
          { id: 'fee-3', schoolId: SCHOOL_B, amountMinor: 25_000, dueOn: '2026-11-01' },
        ],
        payments: [
          { id: 'pay-1', schoolId: SCHOOL_A, feeId: 'fee-1', amountMinor: 20_000 },
          { id: 'pay-2', schoolId: SCHOOL_A, feeId: null, amountMinor: 5_000 },
          { id: 'pay-3', schoolId: SCHOOL_B, feeId: 'fee-3', amountMinor: 25_000 },
        ],
      }),
      '2026-11-07',
    );

    const [ecoleA, ecoleB] = overview.schools;

    expect(ecoleA.feesCount).toBe(2);
    expect(ecoleA.outstandingFeesCount).toBe(2);
    expect(ecoleA.outstandingAmountMinor).toBe(60_000);
    expect(ecoleA.collectedAmountMinor).toBe(25_000);
    expect(ecoleA.overdueFeesCount).toBe(1);

    expect(ecoleB.outstandingFeesCount).toBe(0);
    expect(ecoleB.outstandingAmountMinor).toBe(0);
    expect(ecoleB.collectedAmountMinor).toBe(25_000);

    expect(overview.totals.outstandingFeesCount).toBe(2);
    expect(overview.totals.schoolsWithOutstandingFees).toBe(1);
  });

  it('ne cumule jamais les montants de devises différentes', () => {
    const overview = buildSupervisionOverview(
      buildInput({
        fees: [
          { id: 'fee-a', schoolId: SCHOOL_A, amountMinor: 10_000, dueOn: '2026-11-01' },
          { id: 'fee-b', schoolId: SCHOOL_B, amountMinor: 70_000, dueOn: '2026-11-01' },
        ],
      }),
      '2026-11-07',
    );

    expect(overview.currencies).toEqual([
      { currencyCode: 'EUR', outstandingAmountMinor: 70_000, collectedAmountMinor: 0 },
      { currencyCode: 'XAF', outstandingAmountMinor: 10_000, collectedAmountMinor: 0 },
    ]);
  });

  it('ignore les profils inactifs et les lignes d’école inconnue', () => {
    const overview = buildSupervisionOverview(
      buildInput({
        profiles: [
          { schoolId: SCHOOL_A, role: 'teacher', isActive: false },
          { schoolId: '99999999-9999-4000-8000-000000000099', role: 'teacher', isActive: true },
        ],
        students: [{ schoolId: '99999999-9999-4000-8000-000000000099' }],
      }),
      '2026-11-07',
    );

    expect(overview.totals.staffCount).toBe(0);
    expect(overview.totals.studentsCount).toBe(0);
    expect(overview.roles).toEqual([{ role: 'teacher', count: 1 }]);
  });

  it('reste stable sans aucune école', () => {
    const overview = buildSupervisionOverview(buildInput({ schools: [] }), '2026-11-07');

    expect(overview.schools).toEqual([]);
    expect(overview.totals.schoolsCount).toBe(0);
    expect(overview.currencies).toEqual([]);
    expect(overview.truncated).toBe(false);
  });

  it('signale une vue partielle quand une lecture est tronquée', () => {
    const overview = buildSupervisionOverview(buildInput(), '2026-11-07', true);
    expect(overview.truncated).toBe(true);
  });
});
