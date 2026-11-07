'use client';

import { AlertCircle } from 'lucide-react';
import { messages } from '@/shared/config/messages';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="contenu" className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <AlertCircle aria-hidden="true" className="mx-auto mb-4 size-10 text-red-700" />
        <h1 className="text-2xl font-bold text-slate-950">{messages.common.errorTitle}</h1>
        <p className="mt-3 text-slate-600">{messages.common.errorBody}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800"
        >
          {messages.common.retry}
        </button>
      </section>
    </main>
  );
}
