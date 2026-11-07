import { GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { messages } from '@/shared/config/messages';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/" className="mx-auto flex min-h-11 max-w-lg items-center gap-3 rounded-lg">
          <span className="rounded-lg bg-teal-700 p-2 text-white">
            <GraduationCap aria-hidden="true" className="size-6" />
          </span>
          <span className="font-extrabold tracking-tight text-slate-950">
            {messages.app.name}
          </span>
        </Link>
      </header>
      <main id="contenu" className="mx-auto flex w-full max-w-lg items-center justify-center px-4 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
