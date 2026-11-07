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

export function AppShell({ profile, title, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={getRoleHomePath(profile.role)}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg"
          >
            <span className="rounded-lg bg-teal-700 p-2 text-white">
              <GraduationCap aria-hidden="true" className="size-6" />
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

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900 sm:text-sm">
              {messages.roles[profile.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <div className="space-y-5">{children}</div>
      </main>
    </div>
  );
}
