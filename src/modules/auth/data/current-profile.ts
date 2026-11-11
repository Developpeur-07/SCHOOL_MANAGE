import { cache } from 'react';
import {
  hasSupabasePublicConfig,
} from '@/shared/config/env';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { mapProfileRow, type UserProfile } from '../domain/profile';

async function readCurrentProfile(): Promise<UserProfile | null> {
  if (!hasSupabasePublicConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, full_name, is_active, schools(name, currency_code, locale)')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error('PROFILE_UNAVAILABLE');
  return mapProfileRow(data);
}

// React limite ce cache à la requête serveur courante : aucun profil n’est
// partagé entre utilisateurs ou entre requêtes.
export const getCurrentProfile = cache(readCurrentProfile);
