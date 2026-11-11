import type { ReactNode } from 'react';
import { requireArea } from '@/modules/auth/application/guards';
import { getLinkedChildren } from '@/modules/parent/data/children.supabase';
import { findLinkedChild } from '@/modules/parent/domain/children';
import { ChildSelector } from '@/modules/parent/ui/child-selector';
import { ParentTabs } from '@/modules/parent/ui/parent-tabs';
import { messages } from '@/shared/config/messages';

interface ChildLayoutProps {
  children: ReactNode;
  params: Promise<{ studentId: string }>;
}

export default async function ChildLayout({ children, params }: ChildLayoutProps) {
  const [{ studentId }, profile] = await Promise.all([params, requireArea('parent')]);
  const linkedChildren = await getLinkedChildren(profile.id);
  const currentChild = findLinkedChild(linkedChildren, studentId);

  // Un enfant non rattaché ne doit pas être révélé : la coquille s'affiche
  // sans sélecteur ni navigation, et la page répond « introuvable » (voir
  // `not-found.tsx` du segment). L'accès aux données reste bloqué par la RLS.
  if (!currentChild) return <>{children}</>;

  return (
    <>
      {linkedChildren.length > 1 ? (
        <ChildSelector linkedChildren={linkedChildren} currentStudentId={currentChild.id} />
      ) : null}

      <ParentTabs studentId={currentChild.id} />

      <p className="mt-3 text-sm text-slate-500">{messages.parent.readOnlyNotice}</p>

      {children}
    </>
  );
}
