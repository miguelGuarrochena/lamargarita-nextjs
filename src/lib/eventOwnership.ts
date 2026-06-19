import type { CalendarEvent } from '@/types';

type AuthUser = { uid?: string } | null | undefined;

export function isOwnEvent(event: CalendarEvent, user: AuthUser): boolean {
  return !!user && !!event.user && String(event.user._id) === String(user.uid);
}
