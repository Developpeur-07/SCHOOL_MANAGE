import { redirect } from 'next/navigation';
import { requireActiveProfile } from '@/modules/auth/application/guards';
import { getRoleHomePath } from '@/modules/auth/domain/roles';

export default async function AccountRedirectPage() {
  const profile = await requireActiveProfile();
  redirect(getRoleHomePath(profile.role));
}
