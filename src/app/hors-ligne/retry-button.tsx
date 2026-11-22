'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { messages } from '@/shared/config/messages';

/**
 * Action « Réessayer » de l'écran hors connexion.
 *
 * L'écran hors connexion s'affiche à la place d'une page qui n'a pas pu
 * être chargée. « Réessayer » doit donc recharger la page réellement
 * demandée : un lien vers une adresse fixe ne conviendrait pas, et un lien
 * vide (`href=""`) aurait été un lien cassé.
 */
export function RetryButton() {
  const [enCours, setEnCours] = useState(false);

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => {
        setEnCours(true);
        window.location.reload();
      }}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-70"
    >
      <RefreshCw aria-hidden="true" className="size-4" />
      {enCours ? messages.common.retrying : messages.common.retry}
    </button>
  );
}
