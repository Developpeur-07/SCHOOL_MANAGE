import { LoaderCircle } from 'lucide-react';
import { messages } from '@/shared/config/messages';

export default function Loading() {
  return (
    <main id="contenu" className="flex min-h-screen items-center justify-center px-4">
      <div role="status" className="flex items-center gap-3 rounded-xl bg-white p-5 font-semibold text-slate-700 shadow-sm">
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-teal-700" />
        {messages.app.loading}
      </div>
    </main>
  );
}
