'use client';

import { useSyncExternalStore } from 'react';
import {
  CONSENT_STORAGE_KEY,
  parseConsentDecision,
  type ConsentDecision,
} from '../domain/consent';

/**
 * Lecture du choix de l'internaute.
 *
 * Le choix vit dans `localStorage`, une source externe au composant. Il est
 * lu avec `useSyncExternalStore` : le composant seAbonne à la source et
 * n'écrit jamais son état depuis un effet, ce qui évite les rendus en
 * cascade.
 *
 * L'événement `sm:consent-change` est émis à chaque modification, et
 * l'événement `storage` couvre les onglets ouverts sur le même site.
 */

const EVENEMENT = 'sm:consent-change';

function lireDecision(): ConsentDecision | null {
  try {
    return parseConsentDecision(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    // Stockage indisponible : aucune décision n'est enregistrée, la mesure
    // reste désactivée.
    return null;
  }
}

function sAbonner(callback: () => void): () => void {
  window.addEventListener(EVENEMENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENEMENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** Décision enregistrée, ou `null` si aucun choix n'a été fait. */
export function useConsentDecision(): ConsentDecision | null {
  return useSyncExternalStore(sAbonner, lireDecision, () => null);
}

/**
 * Indique si le composant est rendu dans le navigateur.
 *
 * Le premier rendu serveur ne doit pas afficher le bandeau : le choix de
 * l'internaute n'est pas connu à ce moment-là, et l'afficher puis le
 * retirer produirait un clignotement.
 */
export function useEstMonte(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

/** Enregistre la décision et prévient les composants abonnés. */
export function enregistrerDecision(choix: ConsentDecision): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choix);
  } catch {
    // Sans stockage, le choix reste valable pour la session courante.
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: choix }));
}
