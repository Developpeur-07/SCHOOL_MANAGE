import type { AppRole } from '@/modules/auth/domain/roles';

/**
 * Domaine de la supervision globale.
 *
 * La lecture des données est faite par la couche `data` ; ce module ne fait
 * que des agrégats purs, testables sans base de données. Aucun filtrage par
 * école n'est appliqué ici : la RLS a déjà garanti que le lecteur est un
 * super-admin, c'est-à-dire qu'il voit l'ensemble des écoles.
 */

export interface SupervisionSchoolRow {
  id: string;
  name: string;
  currencyCode: string;
  locale: string;
}

export interface SupervisionProfileRow {
  schoolId: string | null;
  role: AppRole;
  isActive: boolean;
}

export interface SupervisionClassRow {
  schoolId: string;
}

export interface SupervisionStudentRow {
  schoolId: string;
}

export interface SupervisionGradeRow {
  schoolId: string;
  status: 'draft' | 'published';
}

export interface SupervisionAttendanceRow {
  schoolId: string;
}

export interface SupervisionFeeRow {
  id: string;
  schoolId: string;
  amountMinor: number;
  dueOn: string;
}

export interface SupervisionPaymentRow {
  id: string;
  schoolId: string;
  feeId: string | null;
  amountMinor: number;
}

export interface SupervisionAnnouncementRow {
  schoolId: string;
  status: 'draft' | 'published';
}

export interface SupervisionNotificationRow {
  schoolId: string;
}

export interface SupervisionInput {
  schools: SupervisionSchoolRow[];
  profiles: SupervisionProfileRow[];
  classes: SupervisionClassRow[];
  students: SupervisionStudentRow[];
  grades: SupervisionGradeRow[];
  attendance: SupervisionAttendanceRow[];
  fees: SupervisionFeeRow[];
  payments: SupervisionPaymentRow[];
  announcements: SupervisionAnnouncementRow[];
  notifications: SupervisionNotificationRow[];
}

export interface SupervisionSchool {
  id: string;
  name: string;
  currencyCode: string;
  locale: string;
  studentsCount: number;
  staffCount: number;
  parentsCount: number;
  classesCount: number;
  publishedGradesCount: number;
  draftGradesCount: number;
  attendanceRecordsCount: number;
  feesCount: number;
  outstandingFeesCount: number;
  overdueFeesCount: number;
  outstandingAmountMinor: number;
  collectedAmountMinor: number;
  publishedAnnouncementsCount: number;
  notificationsCount: number;
}

export interface SupervisionCurrencyTotal {
  currencyCode: string;
  outstandingAmountMinor: number;
  collectedAmountMinor: number;
}

export interface SupervisionTotals {
  schoolsCount: number;
  studentsCount: number;
  staffCount: number;
  parentsCount: number;
  classesCount: number;
  publishedGradesCount: number;
  attendanceRecordsCount: number;
  feesCount: number;
  outstandingFeesCount: number;
  publishedAnnouncementsCount: number;
  notificationsCount: number;
  /** Écoles présentant au moins un impayé. */
  schoolsWithOutstandingFees: number;
}

export interface SupervisionRoleBreakdown {
  role: AppRole;
  count: number;
}

export interface SupervisionOverview {
  schools: SupervisionSchool[];
  totals: SupervisionTotals;
  roles: SupervisionRoleBreakdown[];
  /**
   * Totaux financiers regroupés par devise.
   *
   * Les écoles peuvent utiliser des devises différentes : aucun montant n'est
   * cumulé d'une devise à l'autre.
   */
  currencies: SupervisionCurrencyTotal[];
}

const STAFF_ROLES: readonly AppRole[] = [
  'direction',
  'secretary',
  'accountant',
  'teacher',
  'supervisor',
];

function emptySchool(school: SupervisionSchoolRow): SupervisionSchool {
  return {
    id: school.id,
    name: school.name,
    currencyCode: school.currencyCode,
    locale: school.locale,
    studentsCount: 0,
    staffCount: 0,
    parentsCount: 0,
    classesCount: 0,
    publishedGradesCount: 0,
    draftGradesCount: 0,
    attendanceRecordsCount: 0,
    feesCount: 0,
    outstandingFeesCount: 0,
    overdueFeesCount: 0,
    outstandingAmountMinor: 0,
    collectedAmountMinor: 0,
    publishedAnnouncementsCount: 0,
    notificationsCount: 0,
  };
}

/**
 * Construit la vue d'ensemble de la supervision.
 *
 * @param input lignes brutes lues en base
 * @param today date civile de référence (`AAAA-MM-JJ`) pour le décompte des frais échus
 */
export function buildSupervisionOverview(
  input: SupervisionInput,
  today: string,
): SupervisionOverview {
  const schools = new Map<string, SupervisionSchool>();
  for (const school of input.schools) {
    schools.set(school.id, emptySchool(school));
  }

  const roleCounts = new Map<AppRole, number>();
  const countRole = (role: AppRole) => {
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  };

  for (const profile of input.profiles) {
    if (!profile.isActive) continue;
    countRole(profile.role);

    // Un profil de supervision globale n'appartient à aucune école : il est
    // compté globalement mais n'est rattaché à aucune ligne d'école.
    if (!profile.schoolId) continue;
    const school = schools.get(profile.schoolId);
    if (!school) continue;

    if (profile.role === 'parent') school.parentsCount += 1;
    else if (STAFF_ROLES.includes(profile.role)) school.staffCount += 1;
  }

  for (const row of input.classes) {
    const school = schools.get(row.schoolId);
    if (school) school.classesCount += 1;
  }

  for (const row of input.students) {
    const school = schools.get(row.schoolId);
    if (school) school.studentsCount += 1;
  }

  for (const row of input.grades) {
    const school = schools.get(row.schoolId);
    if (!school) continue;
    if (row.status === 'published') school.publishedGradesCount += 1;
    else school.draftGradesCount += 1;
  }

  for (const row of input.attendance) {
    const school = schools.get(row.schoolId);
    if (school) school.attendanceRecordsCount += 1;
  }

  const paidByFee = new Map<string, number>();
  for (const payment of input.payments) {
    const school = schools.get(payment.schoolId);
    if (school) school.collectedAmountMinor += payment.amountMinor;
    if (!payment.feeId) continue;
    paidByFee.set(payment.feeId, (paidByFee.get(payment.feeId) ?? 0) + payment.amountMinor);
  }

  for (const fee of input.fees) {
    const school = schools.get(fee.schoolId);
    if (!school) continue;
    school.feesCount += 1;

    const paid = Math.min(paidByFee.get(fee.id) ?? 0, fee.amountMinor);
    const remaining = fee.amountMinor - paid;

    if (remaining > 0) {
      school.outstandingFeesCount += 1;
      school.outstandingAmountMinor += remaining;
      if (fee.dueOn < today) school.overdueFeesCount += 1;
    }
  }

  for (const row of input.announcements) {
    const school = schools.get(row.schoolId);
    if (!school) continue;
    if (row.status === 'published') school.publishedAnnouncementsCount += 1;
  }

  for (const row of input.notifications) {
    const school = schools.get(row.schoolId);
    if (school) school.notificationsCount += 1;
  }

  const schoolList = Array.from(schools.values()).sort((left, right) =>
    left.name.localeCompare(right.name, 'fr'),
  );

  const totals: SupervisionTotals = {
    schoolsCount: schoolList.length,
    studentsCount: 0,
    staffCount: 0,
    parentsCount: 0,
    classesCount: 0,
    publishedGradesCount: 0,
    attendanceRecordsCount: 0,
    feesCount: 0,
    outstandingFeesCount: 0,
    publishedAnnouncementsCount: 0,
    notificationsCount: 0,
    schoolsWithOutstandingFees: 0,
  };

  const currencies = new Map<string, SupervisionCurrencyTotal>();

  for (const school of schoolList) {
    totals.studentsCount += school.studentsCount;
    totals.staffCount += school.staffCount;
    totals.parentsCount += school.parentsCount;
    totals.classesCount += school.classesCount;
    totals.publishedGradesCount += school.publishedGradesCount;
    totals.attendanceRecordsCount += school.attendanceRecordsCount;
    totals.feesCount += school.feesCount;
    totals.outstandingFeesCount += school.outstandingFeesCount;
    totals.publishedAnnouncementsCount += school.publishedAnnouncementsCount;
    totals.notificationsCount += school.notificationsCount;
    if (school.outstandingFeesCount > 0) totals.schoolsWithOutstandingFees += 1;

    const currency = currencies.get(school.currencyCode);
    if (currency) {
      currency.outstandingAmountMinor += school.outstandingAmountMinor;
      currency.collectedAmountMinor += school.collectedAmountMinor;
    } else {
      currencies.set(school.currencyCode, {
        currencyCode: school.currencyCode,
        outstandingAmountMinor: school.outstandingAmountMinor,
        collectedAmountMinor: school.collectedAmountMinor,
      });
    }
  }

  const roles: SupervisionRoleBreakdown[] = Array.from(roleCounts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));

  return {
    schools: schoolList,
    totals,
    roles,
    currencies: Array.from(currencies.values()).sort((left, right) =>
      left.currencyCode.localeCompare(right.currencyCode),
    ),
  };
}
