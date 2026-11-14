'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { messages } from '@/shared/config/messages';
import {
  getChildDisplayName,
  type LinkedChild,
} from '../domain/children';

interface ChildSelectorProps {
  linkedChildren: LinkedChild[];
  currentStudentId: string;
}

export function ChildSelector({ linkedChildren, currentStudentId }: ChildSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label htmlFor="child-selector" className="mb-2 block text-sm font-semibold text-slate-800">
        {messages.parent.childSelector}
      </label>
      <select
        id="child-selector"
        value={currentStudentId}
        disabled={isPending}
        onChange={(event) => {
          const studentId = event.target.value;
          startTransition(() => {
            router.push(`/parent/${encodeURIComponent(studentId)}`);
          });
        }}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 disabled:bg-slate-100 sm:max-w-xl"
      >
        {linkedChildren.map((child) => (
          <option key={child.id} value={child.id}>
            {getChildDisplayName(child)}
            {child.className ? ` — ${child.className}` : ''}
          </option>
        ))}
      </select>
      <span role="status" className="sr-only">
        {isPending ? messages.app.loading : ''}
      </span>
    </div>
  );
}
