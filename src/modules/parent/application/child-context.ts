import { notFound } from 'next/navigation';
import { requireArea } from '@/modules/auth/application/guards';
import type { UserProfile } from '@/modules/auth/domain/profile';
import { getLinkedChildren } from '../data/children.supabase';
import { findLinkedChild, type LinkedChild } from '../domain/children';

export interface ChildContext {
  profile: UserProfile;
  children: LinkedChild[];
  child: LinkedChild;
}

/**
 * Vérifie que l’enfant demandé fait partie des enfants liés du parent connecté.
 *
 * La RLS protège déjà les données : ce garde sert à ne pas révéler
 * l’existence d’un enfant qui n’est pas lié et à renvoyer une page 404.
 */
export async function requireChildAccess(studentId: string): Promise<ChildContext> {
  const profile = await requireArea('parent');
  const children = await getLinkedChildren(profile.id);
  const child = findLinkedChild(children, studentId);

  if (!child) notFound();

  return { profile, children, child };
}
