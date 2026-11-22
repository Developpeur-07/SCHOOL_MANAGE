import { describe, expect, it } from 'vitest';
import {
  countUnreadNotifications,
  mapAnnouncementRow,
  mapNotificationRow,
  type ParentNotification,
} from './announcements';

const announcementRow = {
  id: '1a000000-0000-4000-8000-000000000002',
  title: 'Annonce fictive élève A1',
  body: 'Contenu fictif ciblant uniquement l’élève A1.',
  published_at: '2026-11-03T09:00:00Z',
};

const notificationRow = {
  id: '1c000000-0000-4000-8000-000000000001',
  title: 'Annonce fictive générale A',
  body: 'Notification fictive pour A1.',
  event_type: 'announcement_published',
  created_at: '2026-11-03T09:00:00Z',
  read_at: null,
  announcement_id: announcementRow.id,
  student_id: '11000000-0000-4000-8000-000000000001',
};

describe('mapAnnouncementRow', () => {
  it('mappe une annonce publiée', () => {
    expect(mapAnnouncementRow(announcementRow)).toEqual({
      id: announcementRow.id,
      title: 'Annonce fictive élève A1',
      body: 'Contenu fictif ciblant uniquement l’élève A1.',
      publishedAt: '2026-11-03T09:00:00Z',
    });
  });

  it('refuse une ligne invalide', () => {
    expect(() => mapAnnouncementRow(null)).toThrow('ANNOUNCEMENT_ROW_INVALID');
    expect(() => mapAnnouncementRow({ ...announcementRow, title: '' })).toThrow(
      'ANNOUNCEMENT_ROW_INVALID_TITLE',
    );
  });
});

describe('mapNotificationRow', () => {
  it('mappe une notification et son enfant', () => {
    expect(mapNotificationRow(notificationRow)).toEqual({
      id: notificationRow.id,
      title: 'Annonce fictive générale A',
      body: 'Notification fictive pour A1.',
      eventType: 'announcement_published',
      createdAt: '2026-11-03T09:00:00Z',
      readAt: null,
      announcementId: announcementRow.id,
      studentId: notificationRow.student_id,
    });
  });

  it('exige un enfant rattaché', () => {
    expect(() => mapNotificationRow({ ...notificationRow, student_id: null })).toThrow(
      'NOTIFICATION_ROW_INVALID_STUDENT_ID',
    );
  });
});

describe('countUnreadNotifications', () => {
  const build = (id: string, readAt: string | null): ParentNotification => ({
    id,
    title: 'Titre',
    body: 'Corps',
    eventType: 'announcement_published',
    createdAt: '2026-11-03T09:00:00Z',
    readAt,
    announcementId: null,
    studentId: '11000000-0000-4000-8000-000000000001',
  });

  it('compte les notifications non lues', () => {
    expect(
      countUnreadNotifications([build('1', null), build('2', '2026-11-04T09:00:00Z')]),
    ).toBe(1);
  });

  it('renvoie zéro sans notification', () => {
    expect(countUnreadNotifications([])).toBe(0);
  });
});
