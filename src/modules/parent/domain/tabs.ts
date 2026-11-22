/**
 * Onglets de l’espace parent.
 *
 * L’identifiant de l’enfant fait partie de l’URL : les onglets sont donc
 * toujours liés à un enfant précis, jamais au seul compte du parent.
 */

export const PARENT_TAB_IDS = [
  'resume',
  'resultats',
  'vie-scolaire',
  'paiements',
  'infos',
] as const;

export type ParentTabId = (typeof PARENT_TAB_IDS)[number];

interface ParentTabDefinition {
  id: ParentTabId;
  /** Segment d’URL vide pour l’onglet par défaut. */
  segment: string;
}

export const PARENT_TABS: readonly ParentTabDefinition[] = [
  { id: 'resume', segment: '' },
  { id: 'resultats', segment: 'resultats' },
  { id: 'vie-scolaire', segment: 'vie-scolaire' },
  { id: 'paiements', segment: 'paiements' },
  { id: 'infos', segment: 'infos' },
];

export function getParentTabHref(studentId: string, tabId: ParentTabId): string {
  const tab = PARENT_TABS.find((candidate) => candidate.id === tabId);
  const segment = tab?.segment ?? '';
  const base = `/parent/${encodeURIComponent(studentId)}`;
  return segment ? `${base}/${segment}` : base;
}

/** Retrouve l’onglet à partir du segment d’URL (ou de l’URL complète). */
export function getParentTabIdFromPath(pathname: string): ParentTabId | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 2) return 'resume';
  if (segments.length < 3) return null;

  const segment = segments[segments.length - 1];
  return PARENT_TABS.find((tab) => tab.segment === segment)?.id ?? null;
}
