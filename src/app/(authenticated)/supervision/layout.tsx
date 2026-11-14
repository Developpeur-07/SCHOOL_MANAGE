import type { ReactNode } from 'react';
import { requireSupervisionAccess } from '@/modules/super-admin/application/guards';
import { AppShell } from '@/shared/ui/app-shell';
import { messages } from '@/shared/config/messages';

export default async function SupervisionLayout({ children }: { children: ReactNode }) {
  const profile = await requireSupervisionAccess();
  return <AppShell profile={profile} title={messages.supervision.title}>{children}</AppShell>;
}
