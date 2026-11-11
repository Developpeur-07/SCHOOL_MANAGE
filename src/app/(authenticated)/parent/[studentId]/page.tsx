import { CalendarCheck, GraduationCap, Newspaper, Wallet } from 'lucide-react';
import Link from 'next/link';
import { requireChildAccess } from '@/modules/parent/application/child-context';
import { getChildAnnouncements } from '@/modules/parent/data/child-announcements.supabase';
import { getChildAttendance } from '@/modules/parent/data/child-attendance.supabase';
import { getChildFees, getChildPayments } from '@/modules/parent/data/child-finance.supabase';
import { getChildGrades } from '@/modules/parent/data/child-grades.supabase';
import { computeAveragePercentage } from '@/modules/parent/domain/grades';
import { summarizeAttendance } from '@/modules/parent/domain/attendance';
import { applyPaymentsToFees, summarizeFinance } from '@/modules/parent/domain/finance';
import { getParentTabHref } from '@/modules/parent/domain/tabs';
import { EmptyState } from '@/modules/parent/ui/empty-state';
import { StatCard } from '@/modules/parent/ui/stat-card';
import { messages } from '@/shared/config/messages';
import { formatShortDate } from '@/shared/format/date';
import { formatMinorAmount } from '@/shared/format/money';

interface ChildHomePageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ChildHomePage({ params }: ChildHomePageProps) {
  const { studentId } = await params;
  const { child, children, profile } = await requireChildAccess(studentId);

  const [grades, attendance, fees, payments, announcements] = await Promise.all([
    getChildGrades(child.id, 50),
    getChildAttendance(child.id, 60),
    getChildFees(child.id, 50),
    getChildPayments(child.id, 50),
    getChildAnnouncements(20),
  ]);

  const average = computeAveragePercentage(grades);
  const attendanceSummary = summarizeAttendance(attendance);
  const feesWithStatus = applyPaymentsToFees(fees, payments);
  const financeSummary = summarizeFinance(
    feesWithStatus,
    payments,
    new Date().toISOString().slice(0, 10),
  );
  const currency = profile.schoolCurrency;

  const latestGrades = grades.slice(0, 3);
  const latestAttendance = attendance.slice(0, 3);
  const latestAnnouncements = announcements.slice(0, 2);

  return (
    <div className="space-y-5">
      <section aria-labelledby="resume-stats" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="resume-stats" className="sr-only">
          {messages.parent.resume.title}
        </h2>

        <StatCard
          label={messages.parent.resume.average}
          value={average === null ? '—' : `${average.toFixed(1)} %`}
          detail={messages.parent.resume.latestGrades}
          icon={<GraduationCap aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.parent.resume.presenceRate}
          value={`${attendanceSummary.presenceRate.toFixed(1)} %`}
          detail={`${attendanceSummary.present} / ${attendanceSummary.total}`}
          icon={<CalendarCheck aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.parent.resume.balance}
          value={formatMinorAmount(financeSummary.balanceMinor, currency)}
          detail={messages.parent.resume.finance}
          icon={<Wallet aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.parent.resume.childrenCount}
          value={String(children.length)}
          detail={child.className ?? child.studentCode}
          icon={<Newspaper aria-hidden="true" className="size-5" />}
        />
      </section>

      <section aria-labelledby="resume-grades" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="resume-grades" className="text-base font-bold text-slate-950">
            {messages.parent.resume.latestGrades}
          </h2>
          <Link
            href={getParentTabHref(child.id, 'resultats')}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal-800"
          >
            {messages.parent.resume.seeAll}
          </Link>
        </div>

        {latestGrades.length === 0 ? (
          <EmptyState title={messages.parent.resume.noGrades} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {latestGrades.map((grade) => (
              <li key={grade.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {grade.subjectName}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {grade.evaluationLabel} · {grade.periodName}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-slate-900">
                  {grade.score}/{grade.maxScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="resume-attendance" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="resume-attendance" className="text-base font-bold text-slate-950">
            {messages.parent.resume.attendance}
          </h2>
          <Link
            href={getParentTabHref(child.id, 'vie-scolaire')}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal-800"
          >
            {messages.parent.resume.seeAll}
          </Link>
        </div>

        {latestAttendance.length === 0 ? (
          <EmptyState title={messages.parent.resume.noAttendance} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {latestAttendance.map((record) => (
              <li key={record.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-700">{formatShortDate(record.date)}</span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {messages.parent.attendance[record.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="resume-news" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="resume-news" className="text-base font-bold text-slate-950">
            {messages.parent.resume.news}
          </h2>
          <Link
            href={getParentTabHref(child.id, 'infos')}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal-800"
          >
            {messages.parent.resume.seeAll}
          </Link>
        </div>

        {latestAnnouncements.length === 0 ? (
          <EmptyState title={messages.parent.resume.noNews} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {latestAnnouncements.map((announcement) => (
              <li key={announcement.id} className="py-2">
                <span className="block text-sm font-semibold text-slate-900">{announcement.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {announcement.publishedAt ? formatShortDate(announcement.publishedAt) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
