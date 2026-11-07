import type { ReactNode } from 'react';
import { requireArea } from '@/modules/auth/application/guards';
import { AppShell } from '@/shared/ui/app-shell';
import { messages } from '@/shared/config/messages';

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const profile = await requireArea('parent');
  return <AppShell profile={profile} title={messages.parent.title}>{children}</AppShell>;
}
