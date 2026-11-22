import { redirect } from 'next/navigation';
import { getCurrentProfile } from '../data/current-profile';
import {
  canAccessArea,
  getRoleHomePath,
  type RoleArea,
} from '../domain/roles';

export async function requireActiveProfile() {
  const profile = await getCurrentProfile();

  if (!profile) redirect('/connexion');
  if (!profile.isActive) redirect('/compte-desactive');

  return profile;
}

export async function requireArea(area: RoleArea) {
  const profile = await requireActiveProfile();

  if (!canAccessArea(profile.role, area)) {
    redirect(getRoleHomePath(profile.role));
  }

  return profile;
}
