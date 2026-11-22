import type { ReactNode } from 'react';
import { requireActiveProfile } from '@/modules/auth/application/guards';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  await requireActiveProfile();
  return children;
}
