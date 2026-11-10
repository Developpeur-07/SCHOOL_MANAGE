import { GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { messages } from '@/shared/config/messages';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-2 sm:px-6 sm:py-3">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg sm:gap-3">
            <span className="rounded-lg bg-teal-700 p-2 text-white">
              <GraduationCap aria-hidden="true" className="size-5 sm:size-6" />
            </span>
            <span className="truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
              {messages.app.name}
            </span>
          </Link>
        </div>
      </header>

      <main
        id="contenu"
        className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 pt-6 pb-[calc(2rem+var(--safe-bottom))] sm:px-6 sm:pt-10"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
