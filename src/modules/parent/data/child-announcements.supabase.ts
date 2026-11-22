import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import {
  mapAnnouncementRow,
  mapNotificationRow,
  type ParentAnnouncement,
  type ParentNotification,
} from '../domain/announcements';

/**
 * Annonces publiées adressées au parent (RLS) et notifications personnelles.
 *
 * Les notifications sont celles du parent connecté : une notification
 * concernant un autre enfant ou un autre compte n’est jamais renvoyée.
 */
async function readChildAnnouncements(limit: number): Promise<ParentAnnouncement[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error('ANNOUNCEMENTS_UNAVAILABLE');

  return (data ?? []).map(mapAnnouncementRow);
}

async function readOwnNotifications(limit: number): Promise<ParentNotification[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, event_type, created_at, read_at, announcement_id, student_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('NOTIFICATIONS_UNAVAILABLE');

  return (data ?? []).map(mapNotificationRow);
}

export const getChildAnnouncements = cache(readChildAnnouncements);
export const getOwnNotifications = cache(readOwnNotifications);
