import { describe, expect, it } from 'vitest';
import {
  SCENE_IDS,
  SCENE_ROTATION_MS,
  getPublicScenes,
  isSceneId,
  nextSceneIndex,
  previousSceneIndex,
} from './scenes';

describe('SCENE_IDS', () => {
  it('expose les cinq onglets de l’espace parent, dans le même ordre', () => {
    expect(SCENE_IDS).toEqual([
      'resume',
      'resultats',
      'vie-scolaire',
      'paiements',
      'infos',
    ]);
  });
});

describe('SCENE_ROTATION_MS', () => {
  it('respecte la fenêtre de rotation attendue (4 à 5 s)', () => {
    expect(SCENE_ROTATION_MS).toBeGreaterThanOrEqual(4000);
    expect(SCENE_ROTATION_MS).toBeLessThanOrEqual(5000);
  });
});

describe('isSceneId', () => {
  it('reconnaît les identifiants connus', () => {
    expect(isSceneId('resume')).toBe(true);
    expect(isSceneId('paiements')).toBe(true);
  });

  it('rejette un identifiant inconnu', () => {
    expect(isSceneId('inconnu')).toBe(false);
    expect(isSceneId('')).toBe(false);
  });
});

describe('nextSceneIndex', () => {
  it('avance d’une scène', () => {
    expect(nextSceneIndex(0, 5)).toBe(1);
    expect(nextSceneIndex(3, 5)).toBe(4);
  });

  it('boucle sur la première scène', () => {
    expect(nextSceneIndex(4, 5)).toBe(0);
  });

  it('revient à zéro sur un index hors bornes', () => {
    expect(nextSceneIndex(9, 5)).toBe(0);
    expect(nextSceneIndex(-1, 5)).toBe(0);
  });

  it('refuse un nombre de scènes invalide', () => {
    expect(() => nextSceneIndex(0, 0)).toThrow(RangeError);
    expect(() => nextSceneIndex(0, -3)).toThrow(RangeError);
  });
});

describe('previousSceneIndex', () => {
  it('recule d’une scène', () => {
    expect(previousSceneIndex(4, 5)).toBe(3);
    expect(previousSceneIndex(1, 5)).toBe(0);
  });

  it('boucle sur la dernière scène', () => {
    expect(previousSceneIndex(0, 5)).toBe(4);
  });

  it('revient à zéro sur un index hors bornes', () => {
    expect(previousSceneIndex(12, 5)).toBe(0);
  });
});

describe('getPublicScenes', () => {
  const traductions = [
    { id: 'resume', title: 'Résumé', description: 'Indicateurs.' },
    { id: 'resultats', title: 'Résultats', description: 'Notes par matière.' },
    { id: 'vie-scolaire', title: 'Vie scolaire', description: 'Présences.' },
    { id: 'paiements', title: 'Paiements', description: 'Frais.' },
    { id: 'infos', title: 'Infos', description: 'Annonces.' },
  ];

  it('ordonne les scènes selon les onglets réels, pas selon le fichier de traduction', () => {
    const scenes = getPublicScenes([...traductions].reverse());

    expect(scenes.map((scene) => scene.id)).toEqual([
      'resume',
      'resultats',
      'vie-scolaire',
      'paiements',
      'infos',
    ]);
    expect(scenes[0].title).toBe('Résumé');
    expect(scenes[4].title).toBe('Infos');
  });

  it('signale une scène manquante plutôt que de la présenter silencieusement', () => {
    expect(() => getPublicScenes(traductions.slice(0, 4))).toThrow(/infos/);
  });
});
