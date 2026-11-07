import { Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireArea } from '@/modules/auth/application/guards';
import { getLinkedChildren } from '@/modules/parent/data/children.supabase';
import {
  getChildDisplayName,
  getSingleChildPath,
} from '@/modules/parent/domain/children';
import { messages } from '@/shared/config/messages';

export default async function ParentHomePage() {
  const profile = await requireArea('parent');
  const children = await getLinkedChildren(profile.id);
  const singleChildPath = getSingleChildPath(children);

  if (singleChildPath) redirect(singleChildPath);

  if (children.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <Users aria-hidden="true" className="mx-auto size-10 text-slate-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-950">
          {messages.parent.noChildrenTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          {messages.parent.noChildrenBody}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="select-child-title">
      <h2 id="select-child-title" className="text-xl font-bold text-slate-950">
        {messages.parent.selectChild}
      </h2>
      <p className="mt-1 text-slate-600">{messages.parent.selectChildHint}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {children.map((child) => (
          <li key={child.id}>
            <Link
              href={`/parent/${encodeURIComponent(child.id)}`}
              className="flex min-h-20 flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-600 hover:bg-teal-50"
            >
              <span className="font-bold text-slate-950">{getChildDisplayName(child)}</span>
              <span className="mt-1 text-sm text-slate-600">
                {child.className ?? child.studentCode}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
