import { GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { messages } from '@/shared/config/messages';
import { getRoleHomePath, type UserProfile } from '@/modules/auth/domain';
import { LogoutButton } from '@/modules/auth/ui/logout-button';

interface AppShellProps {
  profile: UserProfile;
  title: string;
  children: ReactNode;
}

/**
 * Shell applicatif responsive.
 *
 * - Téléphone : barre supérieure compacte et collante, contenu pleine largeur.
 * - Tablette et ordinateur : contenu élargi, marges et typographie plus généreux.
 * Les zones sûres (encoches, barres système) sont respectées.
 */
export function AppShell({ profile, title, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-3">
          <Link
            href={getRoleHomePath(profile.role)}
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg sm:gap-3"
          >
            <span className="shrink-0 rounded-lg bg-teal-700 p-2 text-white">
              <GraduationCap aria-hidden="true" className="size-5 sm:size-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
                {messages.app.name}
              </span>
              <span className="block truncate text-xs text-slate-600 sm:text-sm">
                {profile.schoolName ?? messages.app.tagline}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900 sm:px-3 sm:text-sm">
              {messages.roles[profile.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main
        id="contenu"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-[calc(2rem+var(--safe-bottom))] sm:px-6 sm:pt-8 sm:pb-10 lg:px-8"
      >
        <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-5">{children}</div>
      </main>
    </div>
  );
}
