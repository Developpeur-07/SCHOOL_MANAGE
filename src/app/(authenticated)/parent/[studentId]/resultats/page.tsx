import { GraduationCap } from 'lucide-react';
import { requireChildAccess } from '@/modules/parent/application/child-context';
import { getChildGrades } from '@/modules/parent/data/child-grades.supabase';
import { computeAverageOnTwenty, groupGradesBySubject } from '@/modules/parent/domain/grades';
import { EmptyState } from '@/modules/parent/ui/empty-state';
import { messages } from '@/shared/config/messages';
import { formatShortDate } from '@/shared/format/date';

interface ResultsPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { studentId } = await params;
  const { child } = await requireChildAccess(studentId);

  const grades = await getChildGrades(child.id, 100);
  const groups = groupGradesBySubject(grades);
  const average = computeAverageOnTwenty(grades);
  const childName = `${child.firstName} ${child.lastName}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {messages.parent.results.intro.replace('{studentName}', childName)}
      </p>

      {grades.length === 0 ? (
        <EmptyState
          title={messages.parent.results.empty.replace('{studentName}', childName)}
          hint={messages.parent.results.emptyHint}
          icon={<GraduationCap aria-hidden="true" className="size-6" />}
        />
      ) : (
        <>
          <section
            aria-labelledby="results-average"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 id="results-average" className="text-sm font-semibold text-slate-600">
              {messages.parent.results.average}
            </h2>
            <p className="mt-1 text-3xl font-extrabold text-slate-950">
              {average === null ? '—' : `${average.toFixed(1)} / 20`}
            </p>
          </section>

          {groups.map((group) => (
            <section
              key={group.subjectName}
              aria-labelledby={`results-subject-${group.subjectName}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id={`results-subject-${group.subjectName}`}
                  className="text-base font-bold text-slate-950"
                >
                  {group.subjectName}
                </h2>
                <p className="text-sm font-semibold text-slate-600">
                  {messages.parent.results.subjectAverage} :{' '}
                  {group.average === null ? '—' : `${group.average.toFixed(1)} / 20`}
                </p>
              </div>

              <ul className="divide-y divide-slate-100">
                {group.grades.map((grade) => (
                  <li key={grade.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="min-w-0 text-sm font-semibold text-slate-900">
                        {grade.evaluationLabel}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-950">
                        {grade.score}/{grade.maxScore}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {grade.periodName}
                      {grade.publishedAt ? ` · ${formatShortDate(grade.publishedAt)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
