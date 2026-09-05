'use client';

import { useMemo } from 'react';
import { Calendar, type ToolbarProps } from 'react-big-calendar';
import { addDays, endOfDay, endOfMonth, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
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

/**
 * Último día del período que se está mostrando. Si ya cubre la última fecha
 * reservable, avanzar llevaría a un período entero fuera de la ventana.
 */
const getVisibleRangeEnd = (date: Date, view: string): Date => {
  switch (view) {
    case 'day':
      return endOfDay(date);
    case 'week':
    case 'work_week':
      return endOfWeek(date, { locale: es });
    case 'agenda':
      // La vista agenda de react-big-calendar muestra 30 días por defecto.
      return endOfDay(addDays(date, 30));
    default:
      return endOfMonth(date);
  }
};

/**
 * Réplica del toolbar por defecto de react-big-calendar (mismo markup y mismas
 * clases, para no tocar los estilos existentes) con una sola diferencia: el
 * botón de "siguiente" se deshabilita al llegar al último período reservable.
 */
const CalendarToolbar = ({
  label,
  localizer: { messages },
  onNavigate,
  onView,
  view,
  views,
  nextDisabled,
}: ToolbarProps<CalendarEvent> & { nextDisabled: boolean }) => {
  const viewNames = Array.isArray(views) ? views : Object.keys(views);

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('TODAY')}>
          {messages.today}
        </button>
        <button type="button" onClick={() => onNavigate('PREV')}>
          {messages.previous}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          disabled={nextDisabled}
          aria-disabled={nextDisabled}
        >
          {messages.next}
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      {viewNames.length > 1 && (
        <span className="rbc-btn-group">
          {viewNames.map((name) => (
            <button
              type="button"
              key={name}
              className={view === name ? 'rbc-active' : undefined}
              onClick={() => onView(name as typeof view)}
            >
              {messages[name as keyof typeof messages] as string}
            </button>
          ))}
        </span>
      )}
    </div>
  );
};

export interface CalendarViewProps {
  events: CalendarEvent[];
  view: string;
  date: Date;
  selected: CalendarEvent | null;
  /** Última fecha reservable: más allá de esto no se puede navegar ni seleccionar. */
  maxBookingDate: Date;
  onDoubleClickEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDrillDown: (date: Date) => void;
  onView: (view: string) => void;
  onNavigate: (date: Date) => void;
  eventPropGetter: (event: CalendarEvent & { color?: string }) => { style: React.CSSProperties };
  dayPropGetter: (date: Date) => { className?: string };
}

export default function CalendarView({
  events,
  view,
  date,
  selected,
  maxBookingDate,
  onDoubleClickEvent,
  onSelectSlot,
  onSelectEvent,
  onDrillDown,
  onView,
  onNavigate,
  eventPropGetter,
  dayPropGetter,
}: CalendarViewProps) {
  const nextDisabled = getVisibleRangeEnd(date, view) >= maxBookingDate;

  const components = useMemo(
    () => ({
      event: CalendarEventComponent,
      toolbar: (toolbarProps: ToolbarProps<CalendarEvent>) => (
        <CalendarToolbar {...toolbarProps} nextDisabled={nextDisabled} />
      ),
    }),
    [nextDisabled]
  );

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
      dayPropGetter={dayPropGetter}
      components={components}
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
