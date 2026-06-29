'use client';

import { Calendar } from 'react-big-calendar';
import { localizer } from '@/lib/helpers';
import { CalendarEvent as CalendarEventComponent } from './CalendarEvent';
import type { CalendarEvent } from '@/types';

const messagesES = {
  allDay: 'Todo el día',
  previous: '<',
  next: '>',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en este rango',
  showMore: (total: number) => `+ Ver más (${total})`,
};

export interface CalendarViewProps {
  events: CalendarEvent[];
  view: string;
  date: Date;
  selected: CalendarEvent | null;
  onDoubleClickEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDrillDown: (date: Date) => void;
  onView: (view: string) => void;
  onNavigate: (date: Date) => void;
  eventPropGetter: (event: CalendarEvent & { color?: string }) => { style: React.CSSProperties };
}

export default function CalendarView({
  events,
  view,
  date,
  selected,
  onDoubleClickEvent,
  onSelectSlot,
  onSelectEvent,
  onDrillDown,
  onView,
  onNavigate,
  eventPropGetter,
}: CalendarViewProps) {
  return (
    <Calendar
      culture="es"
      localizer={localizer}
      events={events}
      view={view as 'month'}
      date={date}
      startAccessor="start"
      endAccessor="end"
      style={{ height: '100%' }}
      step={60}
      showMultiDayTimes={false}
      messages={messagesES}
      eventPropGetter={eventPropGetter}
      components={{ event: CalendarEventComponent }}
      selectable
      selected={selected}
      longPressThreshold={20}
      onDoubleClickEvent={onDoubleClickEvent}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      onDrillDown={onDrillDown}
      onSelecting={() => true}
      onView={onView}
      onNavigate={onNavigate}
    />
  );
}
