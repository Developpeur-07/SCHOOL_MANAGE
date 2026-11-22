import Link from 'next/link';
import { messages } from '@/shared/config/messages';

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-950">{messages.notFound.title}</h1>
        <p className="mt-3 text-slate-600">{messages.notFound.body}</p>
        <Link
          href="/compte"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800"
        >
          {messages.notFound.action}
        </Link>
      </section>
    </main>
  );
}
