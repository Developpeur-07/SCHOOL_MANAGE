import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

/** Indicateur compact utilisé dans le résumé et les onglets. */
export function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {icon ? (
        <span className="shrink-0 rounded-lg bg-teal-50 p-2 text-teal-800">{icon}</span>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p>
        {detail ? <p className="mt-0.5 text-sm text-slate-600">{detail}</p> : null}
      </div>
    </div>
  );
}
