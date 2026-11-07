import { ShieldCheck } from 'lucide-react';
import { messages } from '@/shared/config/messages';

export default function SchoolHomePage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <ShieldCheck aria-hidden="true" className="size-9 text-teal-700" />
      <p className="mt-4 max-w-2xl text-slate-600">{messages.school.readyBody}</p>
    </section>
  );
}
