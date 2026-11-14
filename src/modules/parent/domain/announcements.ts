/**
 * Lecture des annonces publiées et des notifications d’un parent (lecture seule).
 *
 * Une annonce n’est visible par un parent que si une notification lui a été
 * adressée : c’est la règle RLS qui le protège. Le centre de notifications
 * pleinement fonctionnel (lu/non lu) relève de l’étape 7.
 */

export interface ParentAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
}

export interface ParentNotification {
  id: string;
  title: string;
  body: string;
  eventType: string;
  createdAt: string;
  readAt: string | null;
  announcementId: string | null;
  /** Enfant concerné : la notification n’est lisible que si le lien est actif. */
  studentId: string;
}

function readString(value: unknown, prefix: string, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${prefix}_ROW_INVALID_${field}`);
  }
  return value;
}

export function mapAnnouncementRow(row: unknown): ParentAnnouncement {
  if (!row || typeof row !== 'object') throw new Error('ANNOUNCEMENT_ROW_INVALID');

  const announcement = row as Record<string, unknown>;
  if (!('id' in announcement) || !('title' in announcement) || !('body' in announcement)) {
    throw new Error('ANNOUNCEMENT_ROW_INVALID');
  }

  const publishedAt =
    'published_at' in announcement && typeof announcement.published_at === 'string'
      ? announcement.published_at
      : null;

  return {
    id: readString(announcement.id, 'ANNOUNCEMENT', 'ID'),
    title: readString(announcement.title, 'ANNOUNCEMENT', 'TITLE'),
    body: readString(announcement.body, 'ANNOUNCEMENT', 'BODY'),
    publishedAt,
  };
}

export function mapNotificationRow(row: unknown): ParentNotification {
  if (!row || typeof row !== 'object') throw new Error('NOTIFICATION_ROW_INVALID');

  const notification = row as Record<string, unknown>;
  if (
    !('id' in notification) ||
    !('title' in notification) ||
    !('body' in notification) ||
    !('event_type' in notification) ||
    !('created_at' in notification)
  ) {
    throw new Error('NOTIFICATION_ROW_INVALID');
  }

  const readAt =
    'read_at' in notification && typeof notification.read_at === 'string'
      ? notification.read_at
      : null;

  const announcementId =
    'announcement_id' in notification && typeof notification.announcement_id === 'string'
      ? notification.announcement_id
      : null;

  return {
    id: readString(notification.id, 'NOTIFICATION', 'ID'),
    title: readString(notification.title, 'NOTIFICATION', 'TITLE'),
    body: readString(notification.body, 'NOTIFICATION', 'BODY'),
    eventType: readString(notification.event_type, 'NOTIFICATION', 'EVENT_TYPE'),
    createdAt: readString(notification.created_at, 'NOTIFICATION', 'CREATED_AT'),
    readAt,
    announcementId,
    studentId: readString(notification.student_id, 'NOTIFICATION', 'STUDENT_ID'),
  };
}

export function countUnreadNotifications(notifications: ParentNotification[]): number {
  return notifications.filter((notification) => notification.readAt === null).length;
}
