'use client';

import { LogOut, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { messages } from '@/shared/config/messages';
import { hasSupabasePublicConfig } from '@/shared/config/env';
import { createSupabaseBrowserClient } from '@/shared/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    setHasError(false);

    try {
      if (hasSupabasePublicConfig()) {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      router.replace('/connexion');
      router.refresh();
    } catch {
      setHasError(true);
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {hasError ? (
        <span role="alert" className="sr-only">
          {messages.common.logoutError}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        aria-label={messages.common.logout}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-5" />
        )}
        <span className="sr-only sm:not-sr-only">
          {isPending ? messages.common.logoutPending : messages.common.logout}
        </span>
      </button>
    </div>
  );
}
