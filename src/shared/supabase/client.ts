import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig, SUPABASE_COOKIE_NAME } from '@/shared/config/env';

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient(url, anonKey, {
    cookieOptions: { name: SUPABASE_COOKIE_NAME },
  });
}
