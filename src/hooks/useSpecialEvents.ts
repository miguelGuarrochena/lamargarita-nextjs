import { useMemo } from 'react';
import { specialEvents2026 } from '@/lib/specialDates2026';
import { CalendarEvent } from '@/types';

interface SpecialEventWithColor extends CalendarEvent {
  color: string;
  allDay: boolean;
  start: Date;
  end: Date;
}

export const useSpecialEvents = () => {
  const specialEventsWithColors = useMemo((): SpecialEventWithColor[] => {
    return specialEvents2026.map(event => ({
      ...event,
      allDay: true,
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.booking === 'FR' ? '#DCDCDC' : '#e67e22' // FR (Feriado) → #DCDCDC, VC (Vacaciones) → #e67e22
    }));
  }, []);

  return specialEventsWithColors;
};
