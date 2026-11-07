import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { hasSupabasePublicConfig } from '@/shared/config/env';
import { messages } from '@/shared/config/messages';
import { getCurrentProfile } from '@/modules/auth/data/current-profile';
import { getRoleHomePath } from '@/modules/auth/domain/roles';
import { LoginForm } from '@/modules/auth/ui/login-form';

export const metadata: Metadata = { title: messages.auth.loginTitle };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile?.isActive) redirect(getRoleHomePath(profile.role));
  if (profile && !profile.isActive) redirect('/compte-desactive');

  const isConfigured = hasSupabasePublicConfig();

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
        {messages.auth.loginTitle}
      </h1>
      <p className="mb-7 mt-2 text-slate-600">{messages.auth.loginSubtitle}</p>

      {!isConfigured ? (
        <div role="status" className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-bold">{messages.common.configurationTitle}</h2>
            <p className="mt-1">{messages.common.configurationBody}</p>
          </div>
        </div>
      ) : null}

      <LoginForm isConfigured={isConfigured} />
    </section>
  );
}
