import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { mapLinkedChild, type LinkedChild } from '../domain/children';

async function readLinkedChildren(guardianId: string): Promise<LinkedChild[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('guardian_links')
    .select(`
      student:students!inner (
        id,
        first_name,
        last_name,
        student_code,
        class:classes!inner (name)
      )
    `)
    .eq('guardian_id', guardianId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error('LINKED_CHILDREN_UNAVAILABLE');
  return (data ?? []).map(mapLinkedChild);
}

// Dédoublonne les lectures du layout parent, du sélecteur et de la page enfant.
export const getLinkedChildren = cache(readLinkedChildren);
