import { LoaderCircle } from 'lucide-react';
import { messages } from '@/shared/config/messages';

/**
 * Squelette de chargement partagé par les cinq onglets de l’espace enfant.
 * Il est affiché sous la coquille (sélecteur + onglets) afin que la navigation
 * reste visible et cliquable pendant la récupération des données.
 */
export default function ChildSpaceLoading() {
  return (
    <div className="mt-5 space-y-5" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-teal-700" />
        {messages.parent.loadingTitle}
      </p>
      <p className="text-sm text-slate-500">{messages.parent.loadingHint}</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>

      <div
        className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
        aria-hidden="true"
      />
    </div>
  );
}
