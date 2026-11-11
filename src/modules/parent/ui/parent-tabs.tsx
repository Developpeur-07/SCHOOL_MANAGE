'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { messages } from '@/shared/config/messages';
import { getParentTabHref, getParentTabIdFromPath, PARENT_TABS } from '../domain/tabs';

interface ParentTabsProps {
  studentId: string;
}

/**
 * Navigation entre les cinq onglets de l’espace parent.
 *
 * Sur téléphone, la barre défile horizontalement sans faire déborder la page ;
 * sur grand écran, les cinq entrées tiennent sur une ligne. L’onglet courant
 * est déduit de l’URL : aucune donnée n’est échangée entre le serveur et le
 * client.
 */
export function ParentTabs({ studentId }: ParentTabsProps) {
  const pathname = usePathname();
  const activeTab = getParentTabIdFromPath(pathname);

  return (
    <nav aria-label={messages.parent.tabsNavLabel} className="mt-4">
      <ul
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {PARENT_TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <li key={tab.id} className="snap-start">
              <Link
                href={getParentTabHref(studentId, tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {messages.parent.tabs[tab.id]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
