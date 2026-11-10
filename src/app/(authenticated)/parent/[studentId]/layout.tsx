import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requireArea } from '@/modules/auth/application/guards';
import { getLinkedChildren } from '@/modules/parent/data/children.supabase';
import { findLinkedChild } from '@/modules/parent/domain/children';
import { ChildSelector } from '@/modules/parent/ui/child-selector';

interface ChildLayoutProps {
  children: ReactNode;
  params: Promise<{ studentId: string }>;
}

export default async function ChildLayout({ children, params }: ChildLayoutProps) {
  const [{ studentId }, profile] = await Promise.all([params, requireArea('parent')]);
  const linkedChildren = await getLinkedChildren(profile.id);
  const currentChild = findLinkedChild(linkedChildren, studentId);

  if (!currentChild) notFound();

  return (
    <>
      {linkedChildren.length > 1 ? (
        <ChildSelector linkedChildren={linkedChildren} currentStudentId={currentChild.id} />
      ) : null}
      {children}
    </>
  );
}
