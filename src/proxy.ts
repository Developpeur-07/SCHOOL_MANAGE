import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getSupabasePublicConfig,
  hasSupabasePublicConfig,
} from '@/shared/config/env';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabasePublicConfig()) return response;

  const { url, anonKey } = getSupabasePublicConfig();
  const supabase = createServerClient(url, anonKey, {
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)',
  ],
};
