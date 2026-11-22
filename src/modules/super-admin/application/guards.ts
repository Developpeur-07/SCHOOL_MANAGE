import { redirect } from 'next/navigation';
import { requireArea } from '@/modules/auth/application/guards';
import { getRoleHomePath, isSuperAdmin } from '@/modules/auth/domain/roles';

/**
 * Accès à la supervision globale.
 *
 * Deux barrières successives :
 *  - `requireArea('admin')` redirige vers l’espace du rôle si l’utilisateur
 *    n’a pas le rôle de supervision ;
 *  - le contrôle explicite du rôle garantit qu’aucun autre rôle n’atteint
 *    cette zone, y compris si la table des zones évoluait.
 *
 * La RLS reste la barrière principale : même avec un accès direct à la
 * route, un utilisateur non super-admin ne lit aucune ligne métier.
 */
export async function requireSupervisionAccess() {
  const profile = await requireArea('admin');

  if (!isSuperAdmin(profile.role)) {
    redirect(getRoleHomePath(profile.role));
  }

  return profile;
}
