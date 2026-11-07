import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { messages } from '@/shared/config/messages';
import { LogoutButton } from '@/modules/auth/ui/logout-button';

export const metadata: Metadata = { title: messages.auth.disabledTitle };

export default function DisabledAccountPage() {
  return (
    <section className="w-full rounded-2xl border border-amber-300 bg-white p-6 text-center shadow-sm sm:p-8">
      <AlertCircle aria-hidden="true" className="mx-auto size-10 text-amber-700" />
      <h1 className="mt-4 text-2xl font-bold text-slate-950">{messages.auth.disabledTitle}</h1>
      <p className="mb-6 mt-3 text-slate-600">{messages.auth.disabledBody}</p>
      <div className="flex justify-center">
        <LogoutButton />
      </div>
    </section>
  );
}
