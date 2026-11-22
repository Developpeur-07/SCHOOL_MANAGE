import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  hasSupabasePublicConfig,
  SUPABASE_COOKIE_NAME,
} from '@/shared/config/env';
import { getSupabaseServerConfig } from '@/shared/config/env-server';
import { getPublicSiteUrl } from '@/shared/config/site';

/** Chemins servis statiquement, qui n'ont pas besoin d'une session valide. */
const CHEMINS_STATIQUES = [
  '/_next/static/',
  '/_next/image',
  '/icons/',
  '/favicon.ico',
  '/sw.js',
  '/manifest.webmanifest',
  '/opengraph-image',
  '/sitemap.xml',
  '/robots.txt',
];

function estCheminStatique(chemin: string): boolean {
  return CHEMINS_STATIQUES.some((prefixe) => chemin.startsWith(prefixe));
}

/**
 * Indique si l'hôte demandé est une adresse locale.
 *
 * Une adresse locale n'est jamais servie en HTTPS : la rediriger casserait
 * le développement, les tests et la prévisualisation locale.
 */
function estHoteLocal(hote: string): boolean {
  const nom = hote.split(':')[0].toLowerCase();
  return (
    nom === 'localhost' ||
    nom === '127.0.0.1' ||
    nom === '::1' ||
    nom === '0.0.0.0' ||
    nom.endsWith('.localhost') ||
    nom.endsWith('.local')
  );
}

/**
 * Vérifie que l'hôte demandé appartient au site public, et le renvoie.
 *
 * L'hôte est fourni par le client : sans cette vérification, la redirection
 * pourrait être détournée vers un site tiers. Seuls le domaine public connu
 * et ses sous-domaines sont acceptés.
 */
function hoteAutorise(hote: string): string | null {
  if (!hote) return null;

  let domaine: string;
  try {
    domaine = new URL(getPublicSiteUrl()).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (domaine === 'localhost') return null;

  const nom = hote.split(':')[0].toLowerCase();
  if (nom === domaine || nom.endsWith(`.${domaine}`)) return hote;
  return null;
}

export async function proxy(request: NextRequest) {
  // Le transport chiffré est imposé avant tout traitement : une requête
  // reçue en HTTP est renvoyée vers son équivalent en HTTPS, sur le même
  // hôte et le même chemin.
  //
  // La redirection ne concerne que le site public : l'hôte demandé doit
  // appartenir au domaine connu, et ne pas être local. Sans cette double
  // condition, le développement, les tests et la prévisualisation locale —
  // qui ne disposent pas d'un HTTPS — deviendraient inaccessibles.
  const protocole = request.headers.get('x-forwarded-proto');
  const hoteDemande =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const hote = hoteAutorise(hoteDemande);

  if (protocole === 'http' && hote && !estHoteLocal(hote)) {
    const cible = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `https://${hote}`,
    );
    return NextResponse.redirect(cible.toString(), 308);
  }

  let response = NextResponse.next({ request });

  if (estCheminStatique(request.nextUrl.pathname)) return response;
  if (!hasSupabasePublicConfig()) return response;

  const { url, anonKey } = getSupabaseServerConfig();
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: SUPABASE_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // Valide la session auprès de Supabase et déclenche son rafraîchissement.
    await supabase.auth.getUser();
  } catch {
    // Une coupure réseau ne doit pas rendre toute l’application inaccessible.
    // Les layouts protégés reverront l’autorisation avant d’afficher les données.
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
