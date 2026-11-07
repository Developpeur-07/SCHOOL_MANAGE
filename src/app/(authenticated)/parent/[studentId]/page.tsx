import { ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireArea } from '@/modules/auth/application/guards';
import { getLinkedChildren } from '@/modules/parent/data/children.supabase';
import {
  findLinkedChild,
  getChildDisplayName,
} from '@/modules/parent/domain/children';
import { messages } from '@/shared/config/messages';

interface ChildHomePageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ChildHomePage({ params }: ChildHomePageProps) {
  const [{ studentId }, profile] = await Promise.all([params, requireArea('parent')]);
  const children = await getLinkedChildren(profile.id);
  const child = findLinkedChild(children, studentId);

  if (!child) notFound();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-teal-50 p-3 text-teal-800">
          <ShieldCheck aria-hidden="true" className="size-7" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {messages.parent.childSpaceTitle.replace(
              '{studentName}',
              getChildDisplayName(child),
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {messages.parent.class} : {child.className ?? child.studentCode}
          </p>
          <p className="mt-4 max-w-2xl text-slate-600">{messages.parent.readyBody}</p>
        </div>
      </div>
    </section>
  );
}
