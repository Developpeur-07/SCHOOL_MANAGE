export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function hasSupabasePublicConfig(): boolean {
  try {
    getSupabasePublicConfig();
    return true;
  } catch {
    return false;
  }
}

function assertNotSecretKey(anonKey: string): void {
  if (anonKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY_FORBIDDEN');
  }

  const segments = anonKey.split('.');
  if (segments.length !== 3) return;

  let role: unknown;
  try {
    const payload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    role = JSON.parse(globalThis.atob(paddedPayload)).role;
  } catch {
    return;
  }

  if (role === 'service_role') {
    throw new Error('SUPABASE_SECRET_KEY_FORBIDDEN');
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_PUBLIC_CONFIG_MISSING');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('SUPABASE_PUBLIC_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('SUPABASE_PUBLIC_URL_INVALID');
  }

  assertNotSecretKey(anonKey);
  return { url: parsedUrl.toString().replace(/\/$/, ''), anonKey };
}
