import {
  Building2,
  ClipboardList,
  GraduationCap,
  Megaphone,
  School,
  Users,
  Wallet,
} from 'lucide-react';
import { requireSupervisionAccess } from '@/modules/super-admin/application/guards';
import { getSupervisionOverview } from '@/modules/super-admin/data/supervision.supabase';
import { messages } from '@/shared/config/messages';
import { formatMinorAmount } from '@/shared/format/money';
import { StatCard } from '@/shared/ui/stat-card';

export default async function SupervisionPage() {
  await requireSupervisionAccess();
  const overview = await getSupervisionOverview();
  const { totals, schools, roles, currencies, truncated } = overview;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{messages.supervision.intro}</p>

      <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        {messages.supervision.readOnlyNotice}
      </p>

      {truncated ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {messages.supervision.partialNotice}
        </p>
      ) : null}

      <section
        aria-labelledby="supervision-totaux"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="supervision-totaux" className="sr-only">
          {messages.supervision.schoolsTitle}
        </h2>

        <StatCard
          label={messages.supervision.schools}
          value={String(totals.schoolsCount)}
          detail={`${totals.studentsCount} ${messages.supervision.students.toLowerCase()}`}
          icon={<School aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.supervision.students}
          value={String(totals.studentsCount)}
          detail={`${totals.classesCount} ${messages.supervision.classes.toLowerCase()}`}
          icon={<GraduationCap aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.supervision.staff}
          value={String(totals.staffCount)}
          detail={`${totals.parentsCount} ${messages.supervision.parents.toLowerCase()}`}
          icon={<Users aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.supervision.publishedGrades}
          value={String(totals.publishedGradesCount)}
          detail={`${totals.attendanceRecordsCount} ${messages.supervision.attendance.toLowerCase()}`}
          icon={<ClipboardList aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.supervision.outstandingFees}
          value={String(totals.outstandingFeesCount)}
          detail={`${totals.schoolsWithOutstandingFees} ${messages.supervision.schoolsWithOutstanding.toLowerCase()}`}
          icon={<Wallet aria-hidden="true" className="size-5" />}
        />
        <StatCard
          label={messages.supervision.announcements}
          value={String(totals.publishedAnnouncementsCount)}
          detail={`${totals.notificationsCount} ${messages.supervision.notifications.toLowerCase()}`}
          icon={<Megaphone aria-hidden="true" className="size-5" />}
        />
      </section>

      <section aria-labelledby="supervision-ecoles" className="space-y-3">
        <h2 id="supervision-ecoles" className="text-base font-bold text-slate-950">
          {messages.supervision.schoolsTitle}
        </h2>

        {schools.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {messages.supervision.noSchool}
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {schools.map((school) => (
              <li
                key={school.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-950">{school.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {school.currencyCode}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.studentsColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.studentsCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.staffColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.staffCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.parentsColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.parentsCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.classesColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.classesCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.gradesColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.publishedGradesCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.announcementsColumn}</dt>
                    <dd className="font-bold text-slate-900">
                      {school.publishedAnnouncementsCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.notificationsColumn}</dt>
                    <dd className="font-bold text-slate-900">{school.notificationsCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{messages.supervision.outstandingColumn}</dt>
                    <dd className="font-bold text-slate-900">
                      {school.outstandingFeesCount}
                      {school.outstandingAmountMinor > 0 ? (
                        <span className="ml-1 font-semibold text-slate-600">
                          {formatMinorAmount(
                            school.outstandingAmountMinor,
                            school.currencyCode,
                            school.locale,
                          )}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="supervision-comptes" className="space-y-3">
        <h2 id="supervision-comptes" className="text-base font-bold text-slate-950">
          {messages.supervision.rolesTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((entry) => (
            <li
              key={entry.role}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-sm font-semibold text-slate-700">
                {messages.roles[entry.role]}
              </span>
              <span className="text-sm font-extrabold text-slate-950">{entry.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="supervision-devises" className="space-y-3">
        <h2 id="supervision-devises" className="text-base font-bold text-slate-950">
          {messages.supervision.currenciesTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {currencies.map((currency) => (
            <li
              key={currency.currencyCode}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <Building2 aria-hidden="true" className="size-4 text-slate-500" />
                {currency.currencyCode}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">{messages.supervision.outstandingTotal}</dt>
                  <dd className="font-bold text-slate-900">
                    {formatMinorAmount(currency.outstandingAmountMinor, currency.currencyCode)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{messages.supervision.collectedTotal}</dt>
                  <dd className="font-bold text-slate-900">
                    {formatMinorAmount(currency.collectedAmountMinor, currency.currencyCode)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
