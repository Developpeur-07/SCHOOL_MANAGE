'use client';

import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { messages } from '@/shared/config/messages';
import { classifyLoginFailure, type LoginFailureKind } from '../domain/login-error';
import { HONEYPOT_FIELD_NAME, evaluateLoginAttempt } from '../domain/login-attempt';

interface LoginFormProps {
  isConfigured: boolean;
}

const MESSAGES_PAR_KIND: Record<LoginFailureKind, string> = {
  invalidCredentials: messages.auth.invalidCredentials,
  emailNotConfirmed: messages.auth.emailNotConfirmed,
  rateLimited: messages.auth.rateLimited,
  serviceUnavailable: messages.auth.serviceUnavailable,
  requestRefused: messages.auth.requestRefused,
  network: messages.auth.networkError,
  unknown: messages.auth.unknownError,
};

/** Longueur minimale du mot de passe, alignée sur la contrainte serveur. */
const LONGUEUR_MOT_DE_PASSE_MIN = 8;

type ChampErreur = 'email' | 'password' | null;

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorReference, setErrorReference] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<ChampErreur>(null);
  const [isPending, setIsPending] = useState(false);

  // Instant de première ouverture du formulaire : sert à écarter les
  // soumissions instantanées, caractéristiques des robots.
  const openedAt = useRef<number>(0);
  // Valeur du champ piège : un humain ne le remplit jamais.
  const honeypot = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  function showFailure(kind: LoginFailureKind, reference: string): void {
    setErrorMessage(MESSAGES_PAR_KIND[kind]);
    setErrorReference(reference || null);
    setIsPending(false);
  }

  /**
   * Vérifie les champs avant l'envoi.
   *
   * Les deux contrôles renvoient un message en français et signalent le
   * champ fautif, qui reçoit le focus : la personne sait quoi corriger.
   */
  function valider(): boolean {
    const adresse = email.trim();
    if (adresse.length === 0) {
      setFieldError('email');
      setErrorMessage(messages.auth.emailRequired);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
      setFieldError('email');
      setErrorMessage(messages.auth.emailInvalid);
      return false;
    }
    if (password.length === 0) {
      setFieldError('password');
      setErrorMessage(messages.auth.passwordRequired);
      return false;
    }
    if (password.length < LONGUEUR_MOT_DE_PASSE_MIN) {
      setFieldError('password');
      setErrorMessage(messages.auth.passwordTooShort);
      return false;
    }

    setFieldError(null);
    setErrorMessage(null);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorReference(null);

    if (!isConfigured) {
      setErrorMessage(messages.common.configurationBody);
      return;
    }

    if (!valider()) {
      setIsPending(false);
      return;
    }

    // Première barrière anti-spam, côté navigateur : elle évite un appel
    // réseau pour une soumission manifestement automatisée. Le serveur
    // refait la même vérification.
    const elapsedMs = Date.now() - openedAt.current;
    const verdict = evaluateLoginAttempt({
      honeypot: honeypot.current?.value ?? '',
      elapsedMs,
    });
    if (!verdict.allowed) {
      setErrorMessage(messages.auth.tooFast);
      setIsPending(false);
      return;
    }

    setIsPending(true);
    try {
      const reponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          honeypot: honeypot.current?.value ?? '',
          elapsedMs,
        }),
      });

      const resultat = (await reponse.json().catch(() => null)) as {
        ok?: boolean;
        kind?: string;
        reference?: string;
      } | null;

      if (!resultat?.ok) {
        const kind = isFailureKind(resultat?.kind)
          ? resultat.kind
          : classifyLoginFailure({
              status: reponse.status,
              message: resultat?.kind ?? '',
            }).kind;
        showFailure(kind, resultat?.reference ?? '');
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/*
        La validation native est désactivée : les messages d'erreur sont
        rédigés en français, associés au champ fautif et annoncés, ce que la
        validation native du navigateur ne permet pas.
      */}
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
          minLength={3}
          maxLength={320}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError === 'email') setFieldError(null);
          }}
          disabled={isPending || !isConfigured}
          placeholder={messages.auth.emailPlaceholder}
          aria-invalid={fieldError === 'email'}
          aria-describedby={fieldError === 'email' ? 'email-erreur' : undefined}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-600 disabled:bg-slate-100 aria-[invalid=true]:border-red-600"
        />
        {fieldError === 'email' ? (
          <p id="email-erreur" className="mt-1 text-sm font-medium text-red-700">
            {messages.auth.emailRequired}
          </p>
        ) : null}
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
          minLength={LONGUEUR_MOT_DE_PASSE_MIN}
          maxLength={1024}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldError === 'password') setFieldError(null);
          }}
          disabled={isPending || !isConfigured}
          placeholder={messages.auth.passwordPlaceholder}
          aria-invalid={fieldError === 'password'}
          aria-describedby={fieldError === 'password' ? 'password-erreur' : undefined}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-600 disabled:bg-slate-100 aria-[invalid=true]:border-red-600"
        />
        {fieldError === 'password' ? (
          <p id="password-erreur" className="mt-1 text-sm font-medium text-red-700">
            {messages.auth.passwordTooShort}
          </p>
        ) : null}
      </div>

      {/*
        Champ piège anti-spam : hors écran, retiré de la tabulation et de
        l'autocomplétion. Un humain ne le voit pas et ne le remplit pas ; un
        robot qui remplit tous les champs le renseigne.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD_NAME}>{messages.auth.websiteLabel}</label>
        <input
          id={HONEYPOT_FIELD_NAME}
          name={HONEYPOT_FIELD_NAME}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          ref={honeypot}
          defaultValue=""
        />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          data-testid="login-erreur"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
        >
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

/** Vérifie qu'une valeur reçue du serveur est un type d'échec connu. */
function isFailureKind(valeur: unknown): valeur is LoginFailureKind {
  return (
    typeof valeur === 'string' &&
    [
      'invalidCredentials',
      'emailNotConfirmed',
      'rateLimited',
      'serviceUnavailable',
      'requestRefused',
      'network',
      'unknown',
    ].includes(valeur)
  );
}
