import { CalendarDays, ClipboardList, ShieldCheck, Users } from 'lucide-react';
import { messages } from '@/shared/config/messages';

const CARTES = [
  { Icone: Users, titre: 'Élèves et familles' },
  { Icone: ClipboardList, titre: 'Notes et présences' },
  { Icone: CalendarDays, titre: 'Annonces et événements' },
] as const;

export default function SchoolHomePage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <ShieldCheck aria-hidden="true" className="size-9 shrink-0 text-teal-700 sm:size-10" />
        <p className="max-w-2xl text-slate-600">{messages.school.readyBody}</p>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARTES.map(({ Icone, titre }) => (
          <li
            key={titre}
            className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
          >
            <Icone aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">{titre}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
