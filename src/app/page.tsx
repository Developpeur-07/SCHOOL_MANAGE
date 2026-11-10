import { GraduationCap, LogIn, Monitor, Smartphone, Tablet } from 'lucide-react';
import Link from 'next/link';
import { messages } from '@/shared/config/messages';

const ICONES = [Smartphone, Tablet, Monitor] as const;

export default function HomePage() {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:py-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-16">
        <section className="w-full text-center lg:text-left">
          <span className="mx-auto mb-5 inline-flex rounded-2xl bg-teal-700 p-4 text-white lg:mx-0">
            <GraduationCap aria-hidden="true" className="size-9 sm:size-10" />
          </span>

          <p className="mb-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold tracking-wide text-teal-800 uppercase">
            {messages.public.badge}
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {messages.app.name}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600 lg:mx-0">
            {messages.app.tagline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/connexion"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-teal-800 sm:w-auto"
            >
              <LogIn aria-hidden="true" className="size-5" />
              {messages.auth.submit}
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="public-value-title"
          className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:p-8"
        >
          <h2 id="public-value-title" className="text-lg font-bold text-slate-950 sm:text-xl">
            {messages.public.valueTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">{messages.public.valueBody}</p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {messages.public.devices.map((appareil, index) => {
              const Icone = ICONES[index] ?? Monitor;
              return (
                <li
                  key={appareil.title}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <Icone aria-hidden="true" className="size-5 shrink-0 text-teal-700" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-950">
                      {appareil.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">{appareil.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
