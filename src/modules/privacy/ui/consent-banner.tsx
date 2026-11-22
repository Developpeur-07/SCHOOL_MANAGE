'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, ShieldCheck, X } from 'lucide-react';
import { messages } from '@/shared/config/messages';
import { isMeasurementAllowed } from '../domain/consent';
import { enregistrerDecision, useConsentDecision, useEstMonte } from './consent-store';

/**
 * Bandeau de consentement.
 *
 * Le bandeau s'affiche tant qu'aucun choix n'a été enregistré. Il propose
 * deux décisions explicites : accepter ou refuser la mesure d'audience.
 * Aucun outil de mesure n'est chargé tant que l'accord n'est pas donné.
 *
 * Le choix est conservé dans `localStorage` et n'est jamais transmis au
 * serveur : il ne contient aucune donnée personnelle.
 */
export function ConsentBanner() {
  const decision = useConsentDecision();
  const monte = useEstMonte();
  const [details, setDetails] = useState(false);
  const bandeau = useRef<HTMLElement | null>(null);

  const visible = monte && decision === null;

  // Le bandeau est posé par-dessus la page : l'espace qu'il occupe en bas
  // de l'écran est réservé sur le document, pour qu'aucun contenu ne soit
  // masqué. Sans cette réservation, le bouton de connexion par exemple
  // resterait sous le bandeau.
  //
  // Réserver l'espace après l'affichage ne déplace aucun élément déjà
  // visible : il ne provoque donc pas de décalage de mise en page.
  useEffect(() => {
    if (!visible) return;

    const element = bandeau.current;
    if (!element) return;

    const reserver = () => {
      const hauteur = element.getBoundingClientRect().height;
      document.body.style.paddingBottom = `${Math.ceil(hauteur)}px`;
    };

    reserver();

    const observateur = new ResizeObserver(reserver);
    observateur.observe(element);

    return () => {
      observateur.disconnect();
      document.body.style.paddingBottom = '';
    };
  }, [visible, details]);

  if (!visible) return null;

  return (
    <section
      ref={bandeau}
      aria-label={messages.legal.cookieTitle}
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-[0_-4px_24px_rgba(15,23,42,0.12)] sm:px-6 sm:py-5"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"
          >
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-950">{messages.legal.cookieTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-700">{messages.legal.cookieBody}</p>

            {details ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <BarChart3 aria-hidden="true" className="size-4 text-teal-800" />
                  {messages.legal.cookieDetails}
                </p>
                <p className="mt-1 text-sm text-slate-700">{messages.legal.cookieDetailsBody}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={() => enregistrerDecision('granted')}
            data-testid="consent-accept"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800"
          >
            {messages.legal.cookieAccept}
          </button>
          <button
            type="button"
            onClick={() => enregistrerDecision('denied')}
            data-testid="consent-refuse"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {messages.legal.cookieRefuse}
          </button>
          <button
            type="button"
            onClick={() => setDetails((etat) => !etat)}
            aria-expanded={details}
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-900"
          >
            {messages.legal.cookieSettings}
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Bouton de retrait du consentement, affiché une fois l'accord donné.
 *
 * Le retrait doit rester possible à tout moment : c'est une condition de
 * validité du consentement.
 */
export function ConsentSettingsButton() {
  const decision = useConsentDecision();

  if (!isMeasurementAllowed(decision)) return null;

  return (
    <button
      type="button"
      onClick={() => enregistrerDecision('denied')}
      data-testid="consent-withdraw"
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-900"
    >
      <X aria-hidden="true" className="size-4" />
      {messages.legal.cookieLabel}
    </button>
  );
}
