import { useMemo } from 'react';
import { specialEvents2026 } from '@/lib/specialDates2026';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarEvent } from '@/types';

interface SpecialEventWithColor extends CalendarEvent {
  color: string;
  allDay: boolean;
  start: Date;
  end: Date;
}

export const useSpecialEvents = () => {
  const hiddenSpecialEventIds = useCalendarStore((s) => s.hiddenSpecialEventIds);

  const specialEventsWithColors = useMemo((): SpecialEventWithColor[] => {
    const hidden = new Set(hiddenSpecialEventIds);
    return specialEvents2026
      .filter((event) => event.id && !hidden.has(event.id))
      .map((event) => ({
      ...event,
      allDay: true,
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.booking === 'FR' ? '#DCDCDC' : '#e67e22'
    }));
  }, [hiddenSpecialEventIds]);

  return specialEventsWithColors;
};
