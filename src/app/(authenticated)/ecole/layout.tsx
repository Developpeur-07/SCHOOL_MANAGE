import type { ReactNode } from 'react';
import { requireArea } from '@/modules/auth/application/guards';
import { AppShell } from '@/shared/ui/app-shell';
import { messages } from '@/shared/config/messages';

export default async function SchoolLayout({ children }: { children: ReactNode }) {
  const profile = await requireArea('school');
  return <AppShell profile={profile} title={messages.school.title}>{children}</AppShell>;
}
