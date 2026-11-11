import { Bell, Newspaper } from 'lucide-react';
import { requireChildAccess } from '@/modules/parent/application/child-context';
import {
  getChildAnnouncements,
  getOwnNotifications,
} from '@/modules/parent/data/child-announcements.supabase';
import { countUnreadNotifications } from '@/modules/parent/domain/announcements';
import { EmptyState } from '@/modules/parent/ui/empty-state';
import { messages } from '@/shared/config/messages';
import { formatDateTime } from '@/shared/format/date';

interface NewsPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { studentId } = await params;
  const { child, profile } = await requireChildAccess(studentId);

  const [announcements, notifications] = await Promise.all([
    getChildAnnouncements(50),
    getOwnNotifications(50),
  ]);

  // Les annonces sont filtrées par les notifications du parent : une annonce
  // n’est affichée que si elle a été adressée à cet enfant, via le lien actif.
  const childNotifications = notifications.filter(
    (notification) => notification.studentId === child.id,
  );
  const announcementIds = new Set(
    childNotifications
      .map((notification) => notification.announcementId)
      .filter((id): id is string => typeof id === 'string'),
  );
  const childAnnouncements = announcements.filter((announcement) =>
    announcementIds.has(announcement.id),
  );
  const unreadCount = countUnreadNotifications(childNotifications);
  const childName = `${child.firstName} ${child.lastName}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {messages.parent.news.intro.replace('{studentName}', childName)}
      </p>

      <section
        aria-labelledby="news-announcements"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <h2 id="news-announcements" className="mb-3 text-base font-bold text-slate-950">
          {messages.parent.tabs.infos}
        </h2>

        {childAnnouncements.length === 0 ? (
          <EmptyState
            title={messages.parent.news.empty.replace('{studentName}', childName)}
            hint={messages.parent.news.emptyHint}
            icon={<Newspaper aria-hidden="true" className="size-6" />}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {childAnnouncements.map((announcement) => (
              <li key={announcement.id} className="py-3">
                <p className="text-sm font-bold text-slate-950">{announcement.title}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-slate-700">
                  {announcement.body}
                </p>
                {announcement.publishedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {messages.parent.news.publishedOn} :{' '}
                    {formatDateTime(announcement.publishedAt, profile.schoolLocale)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="news-notifications"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="news-notifications" className="text-base font-bold text-slate-950">
            {messages.parent.news.notifications}
          </h2>
          {unreadCount > 0 ? (
            <p className="text-sm font-semibold text-teal-800">
              {unreadCount} {messages.parent.news.unread}
            </p>
          ) : null}
        </div>

        {childNotifications.length === 0 ? (
          <EmptyState
            title={messages.parent.news.noNotifications}
            icon={<Bell aria-hidden="true" className="size-6" />}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {childNotifications.map((notification) => (
              <li key={notification.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(notification.createdAt, profile.schoolLocale)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{notification.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
