import { CircleCheck, CircleDashed, Laptop, Smartphone, Tablet } from 'lucide-react';
import { messages } from '@/shared/config/messages';

/**
 * Section « Un écran adapté à chaque profil ».
 *
 * Ce n'est pas une carte technique d'appareils : chaque entrée décrit un
 * bénéfice concret pour un profil et un poste de travail. Les parents
 * consultent au pouce sur téléphone et tablette, l'école travaille à la
 * souris sur ordinateur.
 */

const ICONES = [Smartphone, Tablet, Laptop] as const;

export function ProfilesSection() {
  return (
    <section
      id="profils"
      aria-labelledby="profils-titre"
      className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20"
    >
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white sm:p-8">
        <div className="max-w-2xl">
          <h2
            id="profils-titre"
            className="text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            {messages.public.profiles.title}
          </h2>
          <p className="mt-3 text-slate-300">{messages.public.profiles.intro}</p>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {messages.public.profiles.items.map((profil, index) => {
            const Icone = ICONES[index] ?? Laptop;
            const complet = profil.status === 'ready';

            return (
              <li
                key={profil.device}
                className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-xl bg-white/10 p-2.5 text-teal-200">
                    <Icone aria-hidden="true" className="size-5" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                      complet
                        ? 'bg-emerald-400/15 text-emerald-200'
                        : 'bg-amber-400/15 text-amber-200'
                    }`}
                  >
                    {complet ? (
                      <CircleCheck aria-hidden="true" className="size-3.5" />
                    ) : (
                      <CircleDashed aria-hidden="true" className="size-3.5" />
                    )}
                    {complet
                      ? messages.public.profiles.statusReady
                      : messages.public.profiles.statusPartial}
                  </span>
                </div>

                <p className="mt-4 text-xs font-bold tracking-wide text-teal-300 uppercase">
                  {profil.device} · {profil.profile}
                </p>
                <p className="mt-1 text-lg font-extrabold text-white">{profil.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{profil.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
