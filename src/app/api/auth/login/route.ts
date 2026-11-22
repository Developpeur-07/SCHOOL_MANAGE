import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { classifyLoginFailure, type LoginFailureKind } from '@/modules/auth/domain/login-error';
import { evaluateLoginAttempt } from '@/modules/auth/domain/login-attempt';
import { LoginRateLimiter } from '@/modules/auth/domain/login-rate-limit';

/**
 * Connexion au compte.
 *
 * La connexion passe par le serveur pour deux raisons :
 *
 * - la session est créée côté serveur, ce qui évite d'exposer au navigateur
 *   la manière de.dialoguer avec le service d'authentification ;
 * - les échecs sont comptés par le serveur. Un compteur placé dans le
 *   navigateur serait effaçable d'un simple rechargement, et ne limiterait
 *   rien.
 *
 * Aucune donnée personnelle n'est conservée par le limiteur : les
 * compartiments sont des empreintes SHA-256 de l'adresse et du compte visé.
 */

/**
 * Limiteur partagé par les requêtes du processus.
 *
 * Il s'applique immédiatement, sans dépendre de la base : la protection est
 * donc active dès la première mise en ligne, avant même l'application des
 * migrations.
 */
const limiteur = new LoginRateLimiter();

/**
 * Adresse d'origine de la requête.
 *
 * L'en-tête est fourni par le proxy ou l'hébergeur. En son absence, la
 * requête est traitée comme provenant d'une source inconnue, ce qui n'a pas
 * d'effet sur le compartiment par compte.
 */
function sourceDeLaRequete(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const premiere = forwarded?.split(',')[0]?.trim();
  const reel = request.headers.get('x-real-ip')?.trim();
  return premiere || reel || '';
}

/** Empreinte d'un compartiment : la valeur brute n'est jamais conservée. */
function empreinte(prefixe: string, valeur: string): string {
  if (!valeur) return '';
  const digest = createHash('sha256').update(valeur.trim().toLowerCase()).digest('hex');
  return `${prefixe}:${digest}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ ok: false, kind: 'unknown' }, { status: 400 });
  }

  const donnees = corps as {
    email?: unknown;
    password?: unknown;
    honeypot?: unknown;
    elapsedMs?: unknown;
  };

  const email = typeof donnees.email === 'string' ? donnees.email.trim() : '';
  const password = typeof donnees.password === 'string' ? donnees.password : '';
  const honeypot = typeof donnees.honeypot === 'string' ? donnees.honeypot : '';
  const elapsedMs = typeof donnees.elapsedMs === 'number' ? donnees.elapsedMs : Number.NaN;

  // La connexion n'accepte qu'une tentative par requête : un envoi en rafale
  // n'a aucun intérêt et alourdit le service.
  if (email.length > 320 || password.length > 1024) {
    return NextResponse.json({ ok: false, kind: 'invalidCredentials' }, { status: 400 });
  }

  // Protection anti-spam : champ piège et délai minimal de saisie.
  const verdict = evaluateLoginAttempt({ honeypot, elapsedMs });
  if (!verdict.allowed) {
    // La réponse est volontairement générique : elle ne révèle pas quel
    // contrôle a détecté l'automatisation.
    return NextResponse.json({ ok: false, kind: 'invalidCredentials' }, { status: 400 });
  }

  const source = sourceDeLaRequete(request);
  const compartiments = [
    empreinte('source', source),
    empreinte('compte', email),
  ].filter((valeur) => valeur.length > 0);

  for (const compartiment of compartiments) {
    const decision = limiteur.check(compartiment);
    if (!decision.allowed) {
      return NextResponse.json(
        { ok: false, kind: 'rateLimited' satisfies LoginFailureKind },
        {
          status: 429,
          headers: { 'Retry-After': String(decision.retryAfterSeconds) },
        },
      );
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const failure = classifyLoginFailure(error);
      for (const compartiment of compartiments) {
        limiteur.recordFailure(compartiment);
      }
      return NextResponse.json(
        { ok: false, kind: failure.kind, reference: failure.reference },
        { status: 401 },
      );
    }

    // Une connexion réussie ne doit pas pénaliser l'utilisateur : les
    // échecs précédents sont oubliés.
    for (const compartiment of compartiments) {
      limiteur.reset(compartiment);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (erreur) {
    const failure = classifyLoginFailure(
      erreur instanceof Error ? { message: erreur.message, name: erreur.name } : null,
    );
    return NextResponse.json(
      { ok: false, kind: failure.kind, reference: failure.reference },
      { status: 502 },
    );
  }
}
