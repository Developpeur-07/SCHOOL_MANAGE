import type { ReactNode } from 'react';
import { requireArea } from '@/modules/auth/application/guards';
import { AppShell } from '@/shared/ui/app-shell';
import { messages } from '@/shared/config/messages';

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const profile = await requireArea('teacher');
  return <AppShell profile={profile} title={messages.teacher.title}>{children}</AppShell>;
}
