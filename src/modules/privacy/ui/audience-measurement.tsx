'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isMeasurementAllowed, isMeasurablePath } from '../domain/consent';
import { useConsentDecision } from './consent-store';

/**
 * Mesure d'audience facultative.
 *
 * Ce composant n'envoie rien tant que le consentement n'a pas été donné :
 * la lecture du choix se fait avant tout appel réseau, et l'appel n'est
 * émis que si la page courante fait partie des pages mesurables.
 *
 * Le consentement peut être donné alors que la page est déjà affichée :
 * l'abonnement à la décision relance alors la mesure de la page courante,
 * sans attendre la navigation suivante.
 *
 * Aucune donnée personnelle n'est transmise : ni identifiant, ni adresse IP
 * n'est ajouté par le client. Le serveur ne reçoit que le chemin de la
 * page, et il ne conserve qu'un compteur agrégé par jour et par chemin.
 */
export function AudienceMeasurement() {
  const pathname = usePathname();
  const decision = useConsentDecision();

  useEffect(() => {
    if (!pathname || !isMeasurablePath(pathname)) return;
    if (!isMeasurementAllowed(decision)) return;

    const corps = JSON.stringify({ path: pathname });
    void fetch('/api/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corps,
      keepalive: true,
    }).catch(() => {
      // Une mesure d'audience ratée ne doit jamais perturber la navigation.
    });
  }, [pathname, decision]);

  return null;
}
