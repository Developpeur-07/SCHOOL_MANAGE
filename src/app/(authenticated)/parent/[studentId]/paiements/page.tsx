import { Receipt, Wallet } from 'lucide-react';
import { requireChildAccess } from '@/modules/parent/application/child-context';
import { getChildFees, getChildPayments } from '@/modules/parent/data/child-finance.supabase';
import { applyPaymentsToFees, summarizeFinance } from '@/modules/parent/domain/finance';
import { EmptyState } from '@/modules/parent/ui/empty-state';
import { StatCard } from '@/modules/parent/ui/stat-card';
import { messages } from '@/shared/config/messages';
import { formatSchoolDate } from '@/shared/format/date';
import { formatMinorAmount } from '@/shared/format/money';

interface PaymentsPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const { studentId } = await params;
  const { child, profile } = await requireChildAccess(studentId);

  const [fees, payments] = await Promise.all([
    getChildFees(child.id, 50),
    getChildPayments(child.id, 50),
  ]);

  const feesWithStatus = applyPaymentsToFees(fees, payments);
  const summary = summarizeFinance(
    feesWithStatus,
    payments,
    new Date().toISOString().slice(0, 10),
  );
  const currency = profile.schoolCurrency;
  const childName = `${child.firstName} ${child.lastName}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {messages.parent.payments.intro.replace('{studentName}', childName)}
      </p>

      {fees.length === 0 ? (
        <EmptyState
          title={messages.parent.payments.empty.replace('{studentName}', childName)}
          hint={messages.parent.payments.emptyHint}
          icon={<Wallet aria-hidden="true" className="size-6" />}
        />
      ) : (
        <>
          <section aria-labelledby="payments-summary" className="grid gap-3 sm:grid-cols-3">
            <h2 id="payments-summary" className="sr-only">
              {messages.parent.payments.balance}
            </h2>

            <StatCard
              label={messages.parent.payments.totalDue}
              value={formatMinorAmount(summary.totalDueMinor, currency, profile.schoolLocale)}
            />
            <StatCard
              label={messages.parent.payments.totalPaid}
              value={formatMinorAmount(summary.totalPaidMinor, currency, profile.schoolLocale)}
            />
            <StatCard
              label={messages.parent.payments.balance}
              value={formatMinorAmount(summary.balanceMinor, currency, profile.schoolLocale)}
              detail={
                summary.overdueCount > 0
                  ? messages.parent.payments.overdue.replace(
                      '{count}',
                      String(summary.overdueCount),
                    )
                  : undefined
              }
            />
          </section>

          <section
            aria-labelledby="payments-fees"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 id="payments-fees" className="mb-3 text-base font-bold text-slate-950">
              {messages.parent.payments.title}
            </h2>

            <ul className="divide-y divide-slate-100">
              {feesWithStatus.map((fee) => (
                <li key={fee.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{fee.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {messages.parent.payments.dueDate} : {formatSchoolDate(fee.dueOn)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-bold text-slate-950">
                      {formatMinorAmount(fee.amountMinor, currency, profile.schoolLocale)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                      {messages.parent.payments.status[fee.status]}
                      {fee.remainingMinor > 0 ? (
                        <span className="ml-2 font-normal text-slate-500">
                          {messages.parent.payments.remaining} :{' '}
                          {formatMinorAmount(fee.remainingMinor, currency, profile.schoolLocale)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="payments-receipts"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 id="payments-receipts" className="mb-3 text-base font-bold text-slate-950">
              {messages.parent.payments.receipts}
            </h2>

            {payments.length === 0 ? (
              <EmptyState title={messages.parent.payments.emptyHint} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <Receipt aria-hidden="true" className="hidden size-4 shrink-0 text-slate-400 sm:block" />
                    <span className="min-w-0 text-sm font-semibold text-slate-900">
                      {payment.receiptNumber}
                    </span>
                    <span className="text-sm text-slate-600">
                      {messages.parent.payments.paidOn}{' '}
                      {formatSchoolDate(payment.paidAt.slice(0, 10))}
                    </span>
                    <span className="text-sm text-slate-600">
                      {messages.parent.payments.method} :{' '}
                      {messages.parent.payments.methodLabels[payment.method]}
                    </span>
                    <span className="sm:ml-auto text-sm font-bold text-slate-950">
                      {formatMinorAmount(payment.amountMinor, currency, profile.schoolLocale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
