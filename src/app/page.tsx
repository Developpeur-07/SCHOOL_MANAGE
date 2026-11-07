import { GraduationCap, LogIn } from 'lucide-react';
import Link from 'next/link';
import { messages } from '@/shared/config/messages';

export default function HomePage() {
  return (
    <main id="contenu" className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto mb-5 inline-flex rounded-2xl bg-teal-700 p-4 text-white">
          <GraduationCap aria-hidden="true" className="size-10" />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
          {messages.app.name}
        </h1>
        <p className="mt-3 text-lg text-slate-600">{messages.app.tagline}</p>
        <Link
          href="/connexion"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 sm:w-auto"
        >
          <LogIn aria-hidden="true" className="size-5" />
          {messages.auth.submit}
        </Link>
      </section>
    </main>
  );
}
