'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardCopy, LifeBuoy } from 'lucide-react';
import { messages } from '@/shared/config/messages';

/**
 * Action « Contacter le support ».
 *
 * Aucun canal de support réel n'existe en production : ni adresse e-mail, ni
 * numéro, ni formulaire distant. Inventer une destination serait trompeur.
 *
 * L'action retenue est donc une action adaptée et réellement utilisable :
 * elle ouvre un panneau qui explique à qui s'adresser selon la situation,
 * et permet de copier un message prêt à envoyer à l'administration de
 * l'école. Aucune donnée n'est transmise : la copie reste locale.
 */
export function SupportPanel() {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState<'idle' | 'ok' | 'echec'>('idle');

  const copier = async () => {
    const modele = messages.public.support.template;
    try {
      await navigator.clipboard.writeText(modele);
      setCopie('ok');
    } catch {
      setCopie('echec');
    }
  };

  return (
    <section
      id="support"
      aria-labelledby="support-titre"
      className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-2xl bg-teal-50 p-3 text-teal-800">
              <LifeBuoy aria-hidden="true" className="size-6" />
            </span>
            <h2
              id="support-titre"
              className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950"
            >
              {messages.public.support.title}
            </h2>
            <p className="mt-3 text-slate-600">{messages.public.support.description}</p>
          </div>

          <div className="w-full lg:w-72">
            <button
              type="button"
              onClick={() => setOuvert((etat) => !etat)}
              aria-expanded={ouvert}
              aria-controls="support-panneau"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-teal-800"
            >
              {messages.public.support.action}
            </button>

            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/connexion"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {messages.public.support.loginCta}
              </Link>
              <Link
                href="/hors-ligne"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
              >
                {messages.public.support.offlineCta}
              </Link>
            </div>
          </div>
        </div>

        <div
          id="support-panneau"
          hidden={!ouvert}
          className="mt-7 border-t border-slate-200 pt-6"
        >
          <h3 className="text-lg font-bold text-slate-950">
            {messages.public.support.panelTitle}
          </h3>

          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {messages.public.support.steps.map((etape, position) => (
              <li
                key={etape.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                  {position + 1}
                </span>
                <p className="mt-3 text-sm font-bold text-slate-950">{etape.title}</p>
                <p className="mt-1 text-sm text-slate-600">{etape.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={copier}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50"
            >
              {copie === 'ok' ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <ClipboardCopy aria-hidden="true" className="size-4" />
              )}
              {messages.public.support.copyTemplate}
            </button>

            <p aria-live="polite" className="mt-2 min-h-5 text-sm text-slate-600">
              {copie === 'ok'
                ? messages.public.support.copied
                : copie === 'echec'
                  ? messages.public.support.copyFailed
                  : ''}
            </p>

            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">
              {messages.public.support.template}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
