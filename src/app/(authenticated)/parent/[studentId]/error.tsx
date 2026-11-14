'use client';

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { messages } from '@/shared/config/messages';

/**
 * Filet de sécurité de l’espace enfant : il encadre le contenu des cinq onglets
 * sans masquer la coquille (sélecteur d’enfant, navigation, avis lecture seule).
 * L’utilisateur peut réessayer sans recharger toute la page.
 */
export default function ChildSpaceError({ reset }: { reset: () => void }) {
  return (
    <div className="mt-5">
      <section
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-5 text-center shadow-sm sm:p-6"
      >
        <AlertTriangle aria-hidden="true" className="mx-auto mb-3 size-9 text-red-700" />
        <h2 className="text-lg font-bold text-slate-950">{messages.parent.errorTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{messages.parent.errorBody}</p>
        <p className="mx-auto mt-2 flex max-w-md items-center justify-center gap-2 text-xs text-slate-500">
          <WifiOff aria-hidden="true" className="size-4 shrink-0" />
          {messages.parent.offlineHint}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          {messages.common.retry}
        </button>
      </section>
    </div>
  );
}
