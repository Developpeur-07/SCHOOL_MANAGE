/**
 * Mesures de mise en page partagées par les tests responsive.
 *
 * Contrôles appliqués à chaque largeur :
 * - aucun débordement horizontal ;
 * - aucune cible interactive < 44 px de hauteur (recommandation tactile) ;
 * - aucun champ de saisie < 16 px (sinon iOS zoome au focus).
 */
export async function mesurer(page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
    const visibles = elements.filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    return {
      largeurViewport: window.innerWidth,
      largeurDocument: document.documentElement.scrollWidth,
      largeurBody: document.body.scrollWidth,
      ciblesPetites: visibles
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label:
              (element.textContent || '').trim().slice(0, 40) ||
              element.getAttribute('aria-label') ||
              element.id ||
              element.tagName,
            hauteur: Math.round(rect.height),
            largeur: Math.round(rect.width),
          };
        })
        .filter((cible) => cible.hauteur < 44),
      policesSaisie: Array.from(document.querySelectorAll('input, select, textarea'))
        .map((element) => ({
          label: element.id || element.tagName,
          taille: parseFloat(getComputedStyle(element).fontSize),
        }))
        .filter((champ) => champ.taille < 16),
    };
  });
}

/** Vérifie l’absence de débordement et la taille des cibles sur la page courante. */
export function verifierMiseEnPage(mesures) {
  const erreurs = [];

  if (mesures.largeurDocument > mesures.largeurViewport + 1) {
    erreurs.push(
      `débordement horizontal du document (${mesures.largeurDocument} > ${mesures.largeurViewport})`,
    );
  }
  if (mesures.largeurBody > mesures.largeurViewport + 1) {
    erreurs.push(
      `débordement horizontal du body (${mesures.largeurBody} > ${mesures.largeurViewport})`,
    );
  }
  if (mesures.ciblesPetites.length > 0) {
    erreurs.push(
      `cibles interactives < 44 px : ${JSON.stringify(mesures.ciblesPetites)}`,
    );
  }
  if (mesures.policesSaisie.length > 0) {
    erreurs.push(`champs de saisie < 16 px : ${JSON.stringify(mesures.policesSaisie)}`);
  }

  return erreurs;
}
