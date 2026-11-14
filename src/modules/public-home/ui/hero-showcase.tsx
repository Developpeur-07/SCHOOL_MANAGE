'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { messages } from '@/shared/config/messages';
import {
  SCENE_ROTATION_MS,
  getPublicScenes,
  nextSceneIndex,
  previousSceneIndex,
} from '../domain/scenes';
import { SceneMockup, type SceneKey } from './scene-mockups';

/**
 * Aperçu animé de l'espace parent.
 *
 * Choix retenus :
 * - cinq scènes, une par onglet réel de l'espace parent ;
 * - rotation de 4,5 s, entre 4 et 5 s comme exigé ;
 * - pause explicite, pause au survol et dès que le focus entre dans l'aperçu ;
 * - rotation suspendue hors écran et onglet masqué ;
 * - indicateurs cliquables et navigables au clavier ;
 * - animations limitées à `transform` et `opacity` ;
 * - `prefers-reduced-motion` respecté : plus de rotation ni de décalage, le
 *   contenu reste statique et sélectionnable par les indicateurs.
 *
 * Le composant reste utilisable sans JavaScript : la première scène est
 * rendue par le serveur et la liste des scènes est annoncée.
 */

const SCENES = getPublicScenes(messages.public.hero.scenes);

export function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [dansLeViewport, setDansLeViewport] = useState(true);
  const [ongletVisible, setOngletVisible] = useState(true);

  const conteneur = useRef<HTMLDivElement>(null);
  const indicateurs = useRef<(HTMLButtonElement | null)[]>([]);

  const prefersReducedMotion = useReducedMotion();

  // Le hero ne s'anime que s'il est visible à l'écran.
  useEffect(() => {
    const element = conteneur.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          setDansLeViewport(entree.isIntersecting);
        }
      },
      { threshold: 0.25 },
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  // Un onglet masqué ne consomme pas de rotation.
  useEffect(() => {
    const onVisibilityChange = () => setOngletVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const enPause = paused || survol || prefersReducedMotion || !dansLeViewport || !ongletVisible;

  useEffect(() => {
    if (enPause) return;

    const minuteur = window.setTimeout(() => {
      setIndex((courant) => nextSceneIndex(courant, SCENES.length));
    }, SCENE_ROTATION_MS);

    return () => window.clearTimeout(minuteur);
  }, [enPause, index]);

  const selectionner = useCallback((cible: number) => {
    setIndex(((cible % SCENES.length) + SCENES.length) % SCENES.length);
  }, []);

  const scene = SCENES[index] ?? SCENES[0];

  const contenu = useMemo(
    () => ({
      initial: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: prefersReducedMotion ? 0 : -12 },
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
    [prefersReducedMotion],
  );

  // Les indicateurs se parcourent avec les flèches, comme un carrousel.
  // Le déplacement part de l'indicateur focalisé, et non de la scène active :
  // c'est le comportement attendu d'une liste d'onglets au clavier.
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const focusIndex = indicateurs.current.findIndex((bouton) => bouton === event.target);
    const depart = focusIndex >= 0 ? focusIndex : index;

    let cible: number | null = null;

    if (event.key === 'ArrowRight') cible = nextSceneIndex(depart, SCENES.length);
    else if (event.key === 'ArrowLeft') cible = previousSceneIndex(depart, SCENES.length);
    else if (event.key === 'Home') cible = 0;
    else if (event.key === 'End') cible = SCENES.length - 1;

    if (cible === null) return;

    event.preventDefault();
    selectionner(cible);
    indicateurs.current[cible]?.focus();
  };

  return (
    <div
      ref={conteneur}
      className="w-full"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSurvol(false);
      }}
    >
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label={messages.public.hero.sceneLabel}
        className="relative"
      >
        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={scene.id} {...contenu}>
              <SceneMockup scene={scene.id as SceneKey} />
            </m.div>
          </AnimatePresence>
        </LazyMotion>
      </div>

      <p aria-live="polite" className="sr-only">
        {messages.public.hero.sceneStatus
          .replace('{index}', String(index + 1))
          .replace('{total}', String(SCENES.length))
          .replace('{title}', scene.title)}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-2">
          {SCENES.map((element, position) => {
            const actif = position === index;
            return (
              <li key={element.id}>
                <button
                  type="button"
                  ref={(node) => {
                    indicateurs.current[position] = node;
                  }}
                  onClick={() => selectionner(position)}
                  aria-label={messages.public.hero.sceneIndicator.replace('{title}', element.title)}
                  aria-current={actif ? 'true' : undefined}
                  className={`min-h-11 min-w-11 rounded-full border-2 p-1 transition-colors ${
                    actif
                      ? 'border-teal-700 bg-teal-700'
                      : 'border-slate-300 bg-white hover:border-teal-400'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`block rounded-full ${actif ? 'bg-white' : 'bg-slate-300'}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setPaused((etat) => !etat)}
          aria-pressed={paused}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {paused ? (
            <Play aria-hidden="true" className="size-4" />
          ) : (
            <Pause aria-hidden="true" className="size-4" />
          )}
          {paused ? messages.public.hero.resume : messages.public.hero.pause}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">{messages.public.hero.previewNote}</p>
    </div>
  );
}
