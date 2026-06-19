import type { CalendarEvent } from '@/types';

type AuthUser = { uid?: string; name?: string } | null | undefined;

type EventUserLike = { _id?: string; id?: string; uid?: string; name?: string };

const ADMIN_USER_NAMES = ['Miguel'] as const;
const SYSTEM_ADMIN_BOOKINGS = new Set(['FR', 'VC']);

export function isAdminUser(user: AuthUser): boolean {
  return !!user?.name && (ADMIN_USER_NAMES as readonly string[]).includes(user.name);
}

export function isSystemAdminEvent(event: CalendarEvent): boolean {
  return (
    SYSTEM_ADMIN_BOOKINGS.has(event.booking) ||
    event.user?.name === 'ADMIN'
  );
}

export function getEventOwnerId(event: CalendarEvent): string | undefined {
  if (!event.user) return undefined;
  const u = event.user as EventUserLike;
  return u._id ?? u.id ?? u.uid;
}

export function isOwnEvent(event: CalendarEvent, user: AuthUser): boolean {
  const ownerId = getEventOwnerId(event);
  return !!user && !!ownerId && String(ownerId) === String(user.uid);
}

export function canManageEvent(event: CalendarEvent, user: AuthUser): boolean {
  if (isOwnEvent(event, user)) return true;
  return isAdminUser(user) && isSystemAdminEvent(event);
}

export function isValidMongoId(id?: string): boolean {
  return !!id && /^[a-f\d]{24}$/i.test(id);
}

type ApiEvent = { booking: string; user: { toString(): string } };
type ApiUser = { uid: string; name?: string };

export function canManageEventOnServer(event: ApiEvent, user: ApiUser): boolean {
  if (event.user.toString() === user.uid) return true;
  return isAdminUser({ name: user.name }) && SYSTEM_ADMIN_BOOKINGS.has(event.booking);
}
