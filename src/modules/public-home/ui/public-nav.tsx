'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Menu, X } from 'lucide-react';
import { messages } from '@/shared/config/messages';

const LIENS = [
  { id: 'avantages', label: messages.public.nav.benefits },
  { id: 'usages', label: messages.public.nav.usages },
  { id: 'profils', label: messages.public.nav.profiles },
  { id: 'temoignage', label: messages.public.nav.testimonial },
  { id: 'support', label: messages.public.nav.support },
] as const;

/**
 * Navigation publique.
 *
 * Sur téléphone, la liste des rubriques est repliée derrière un bouton
 * unique ; le menu se referme à la navigation, à la touche Échap et au
 * retour du focus vers le déclencheur.
 */
export function PublicNav() {
  const [ouvert, setOuvert] = useState(false);
  const [declencheur, setDeclencheur] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!ouvert) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOuvert(false);
        declencheur?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ouvert, declencheur]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg sm:gap-3">
          <span className="shrink-0 rounded-lg bg-teal-700 p-2 text-white">
            <GraduationCap aria-hidden="true" className="size-5 sm:size-6" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
              {messages.app.name}
            </span>
            <span className="block truncate text-xs text-slate-600 sm:text-sm">
              {messages.app.tagline}
            </span>
          </span>
        </Link>

        <nav aria-label={messages.public.nav.label} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LIENS.map((lien) => (
              <li key={lien.id}>
                <a
                  href={`#${lien.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-teal-800"
                >
                  {lien.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/connexion"
            className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800 sm:px-4"
          >
            {messages.public.nav.login}
          </Link>
          <button
            type="button"
            ref={setDeclencheur}
            onClick={() => setOuvert((etat) => !etat)}
            aria-expanded={ouvert}
            aria-controls="nav-mobile"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {ouvert ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">
              {ouvert ? messages.public.nav.closeMenu : messages.public.nav.openMenu}
            </span>
          </button>
        </div>
      </div>

      <nav
        id="nav-mobile"
        aria-label={messages.public.nav.label}
        hidden={!ouvert}
        className="border-t border-slate-200 bg-white lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {LIENS.map((lien) => (
            <li key={lien.id}>
              <a
                href={`#${lien.id}`}
                onClick={() => setOuvert(false)}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-teal-800"
              >
                {lien.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
