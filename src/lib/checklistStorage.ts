import type { CalendarEvent } from '@/types';

const ART_OFFSET_MS = 3 * 60 * 60 * 1000;

export interface ChecklistPersisted {
  items: Record<string, boolean>;
  linkedCheckoutEnd?: string;
}

/** Fecha calendario en Argentina (YYYY-MM-DD). */
export function toArtDateString(date: Date): string {
  const art = new Date(date.getTime() - ART_OFFSET_MS);
  const y = art.getUTCFullYear();
  const m = String(art.getUTCMonth() + 1).padStart(2, '0');
  const d = String(art.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 23:59:59 del día siguiente al check-out, horario Argentina. */
export function getResetDeadline(checkoutEnd: Date | string): Date {
  const checkoutStr =
    typeof checkoutEnd === 'string' ? checkoutEnd : toArtDateString(checkoutEnd);
  const [y, m, d] = checkoutStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 26, 59, 59, 999));
}

export function isPastResetDeadline(
  checkoutEnd: Date | string,
  now = new Date()
): boolean {
  return now.getTime() > getResetDeadline(checkoutEnd).getTime();
}

function isDateInStay(today: string, start: Date, end: Date): boolean {
  const startStr = toArtDateString(start);
  const endStr = toArtDateString(end);
  return today >= startStr && today <= endStr;
}

/** Check-out de la estadía actual o reciente (dentro del changüí). */
export function getRelevantCheckoutEnd(
  events: CalendarEvent[],
  userId: string,
  now = new Date()
): string | null {
  const today = toArtDateString(now);
  const userEvents = events.filter((e) => e.user?._id === userId);

  const active = userEvents.filter((e) => isDateInStay(today, e.start, e.end));
  if (active.length) {
    return active
      .map((e) => toArtDateString(e.end))
      .sort()
      .at(-1)!;
  }

  const inGrace = userEvents
    .filter((e) => {
      const endStr = toArtDateString(e.end);
      if (endStr > today) return false;
      return !isPastResetDeadline(e.end, now);
    })
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());

  if (inGrace.length) {
    return toArtDateString(inGrace[0].end);
  }

  return null;
}

export function parseChecklistStorage(raw: string | null): ChecklistPersisted {
  if (!raw) return { items: {} };

  try {
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if ('items' in data) {
        const record = data as ChecklistPersisted;
        return {
          items: record.items ?? {},
          linkedCheckoutEnd: record.linkedCheckoutEnd,
        };
      }
      return { items: data as Record<string, boolean> };
    }
  } catch {
    /* formato inválido */
  }

  return { items: {} };
}

export function resolveChecklistState(
  persisted: ChecklistPersisted,
  events: CalendarEvent[],
  userId: string,
  now = new Date()
): ChecklistPersisted {
  let { items, linkedCheckoutEnd } = persisted;
  const relevantCheckout = getRelevantCheckoutEnd(events, userId, now);

  if (linkedCheckoutEnd && isPastResetDeadline(linkedCheckoutEnd, now)) {
    return { items: {}, linkedCheckoutEnd: relevantCheckout ?? undefined };
  }

  if (relevantCheckout && linkedCheckoutEnd && relevantCheckout !== linkedCheckoutEnd) {
    return { items: {}, linkedCheckoutEnd: relevantCheckout };
  }

  if (relevantCheckout && !linkedCheckoutEnd) {
    linkedCheckoutEnd = relevantCheckout;
  }

  return { items, linkedCheckoutEnd };
}
