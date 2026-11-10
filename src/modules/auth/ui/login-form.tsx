'use client';

import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { messages } from '@/shared/config/messages';
import { createSupabaseBrowserClient } from '@/shared/supabase/client';
import { classifyLoginFailure, type LoginFailureKind } from '../domain/login-error';

interface LoginFormProps {
  isConfigured: boolean;
}

const MESSAGES_PAR_KIND: Record<LoginFailureKind, string> = {
  invalidCredentials: messages.auth.invalidCredentials,
  emailNotConfirmed: messages.auth.emailNotConfirmed,
  rateLimited: messages.auth.rateLimited,
  serviceUnavailable: messages.auth.serviceUnavailable,
  network: messages.auth.networkError,
  unknown: messages.auth.unknownError,
};

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorReference, setErrorReference] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function showFailure(kind: LoginFailureKind, reference: string): void {
    setErrorMessage(MESSAGES_PAR_KIND[kind]);
    setErrorReference(reference || null);
    setIsPending(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setErrorReference(null);

    if (!isConfigured) {
      setErrorMessage(messages.common.configurationBody);
      return;
    }

    setIsPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const failure = classifyLoginFailure(error);
        showFailure(failure.kind, failure.reference);
        return;
      }

      router.replace('/compte');
      router.refresh();
    } catch (erreur) {
      const failure = classifyLoginFailure(
        erreur instanceof Error
          ? { message: erreur.message, name: erreur.name }
          : null,
      );
      showFailure(failure.kind, failure.reference);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
          {messages.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending || !isConfigured}
          placeholder={messages.auth.emailPlaceholder}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
          {messages.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isPending || !isConfigured}
          placeholder={messages.auth.passwordPlaceholder}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
        />
      </div>

      {errorMessage ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <p className="font-medium text-red-800">{errorMessage}</p>
          {errorReference ? (
            <p className="mt-1 text-xs text-red-700">
              {messages.auth.errorReference} : {errorReference}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !isConfigured}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="size-5" />
        )}
        {isPending ? messages.auth.submitPending : messages.auth.submit}
      </button>
    </form>
  );
}
