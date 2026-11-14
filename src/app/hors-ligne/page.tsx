import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { messages } from '@/shared/config/messages';

export const metadata: Metadata = { title: messages.offline.title };

export default function OfflinePage() {
  return (
    <main
      id="contenu"
      className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 pt-8 pb-[calc(2rem+var(--safe-bottom))]"
    >
      <section
        aria-labelledby="offline-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8"
      >
        <WifiOff aria-hidden="true" className="mx-auto size-10 text-teal-700" />
        <h1 id="offline-title" className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">
          {messages.offline.title}
        </h1>
        <p className="mt-3 text-slate-600">{messages.offline.body}</p>
        <p className="mt-3 text-sm text-slate-500">{messages.offline.privacy}</p>

        <div className="mt-6 grid gap-3">
          <a
            href=""
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800"
          >
            {messages.common.retry}
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 py-3 font-semibold text-teal-800"
          >
            {messages.offline.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
