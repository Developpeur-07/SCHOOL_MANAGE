import { CalendarCheck } from 'lucide-react';
import { requireChildAccess } from '@/modules/parent/application/child-context';
import { getChildAttendance } from '@/modules/parent/data/child-attendance.supabase';
import { summarizeAttendance } from '@/modules/parent/domain/attendance';
import { EmptyState } from '@/modules/parent/ui/empty-state';
import { StatCard } from '@/modules/parent/ui/stat-card';
import { messages } from '@/shared/config/messages';
import { formatSchoolDate } from '@/shared/format/date';

interface SchoolLifePageProps {
  params: Promise<{ studentId: string }>;
}

export default async function SchoolLifePage({ params }: SchoolLifePageProps) {
  const { studentId } = await params;
  const { child } = await requireChildAccess(studentId);

  const attendance = await getChildAttendance(child.id, 120);
  const summary = summarizeAttendance(attendance);
  const childName = `${child.firstName} ${child.lastName}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {messages.parent.attendance.intro.replace('{studentName}', childName)}
      </p>

      {attendance.length === 0 ? (
        <EmptyState
          title={messages.parent.attendance.empty.replace('{studentName}', childName)}
          hint={messages.parent.attendance.emptyHint}
          icon={<CalendarCheck aria-hidden="true" className="size-6" />}
        />
      ) : (
        <>
          <section aria-labelledby="attendance-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <h2 id="attendance-summary" className="sr-only">
              {messages.parent.attendance.summaryLabel.replace(
                '{count}',
                String(summary.total),
              )}
            </h2>

            <StatCard
              label={messages.parent.attendance.present}
              value={String(summary.present)}
              detail={messages.parent.attendance.summaryLabel.replace(
                '{count}',
                String(summary.total),
              )}
            />
            <StatCard label={messages.parent.attendance.absent} value={String(summary.absent)} />
            <StatCard label={messages.parent.attendance.late} value={String(summary.late)} />
            <StatCard
              label={messages.parent.attendance.excused}
              value={String(summary.excused)}
            />
          </section>

          <section
            aria-labelledby="attendance-list"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 id="attendance-list" className="mb-3 text-base font-bold text-slate-950">
              {messages.parent.attendance.title}
            </h2>

            <ul className="divide-y divide-slate-100">
              {attendance.map((record) => (
                <li key={record.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-40 shrink-0 text-sm font-semibold text-slate-900">
                    {formatSchoolDate(record.date)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {messages.parent.attendance[record.status]}
                  </span>
                  {record.comment ? (
                    <span className="min-w-0 text-sm text-slate-600">{record.comment}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
