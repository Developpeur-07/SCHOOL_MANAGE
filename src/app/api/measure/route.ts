import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { MEASURABLE_PATHS } from '@/modules/privacy/domain/consent';

/**
 * Point d'entrée de la mesure d'audience.
 *
 * La route n'accepte qu'un chemin de page public listé explicitement. Elle
 * ne reçoit ni identifiant, ni adresse IP, ni donnée personnelle : le client
 * n'a rien d'autre à envoyer et le serveur ne conserve qu'un compteur
 * agrégé par jour et par chemin.
 *
 * Le contrôle du consentement est effectué par le client avant l'appel. Le
 * serveur ne peut pas vérifier ce choix de façon fiable — il n'a pas accès
 * au stockage local du navigateur — mais il n'enregistre que des données
 * agrégées, sans effet sur le service : une mesure abusive resterait sans
 * conséquence sur les données des familles.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let chemin: unknown;
  try {
    const corps = await request.json();
    chemin = corps?.path;
  } catch {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }

  if (typeof chemin !== 'string' || !isAllowed(chemin)) {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('register_audience_visit', {
      p_path: chemin,
    });

    if (error) {
      // La table de mesure peut ne pas encore exister : l'absence de mesure
      // ne doit pas produire d'erreur visible par l'internaute.
      return NextResponse.json({ recorded: false }, { status: 202 });
    }

    return NextResponse.json({ recorded: true }, { status: 202 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 202 });
  }
}

function isAllowed(chemin: string): boolean {
  return (MEASURABLE_PATHS as readonly string[]).includes(chemin);
}
