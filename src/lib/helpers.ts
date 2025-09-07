import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Event } from '@/types';

const locales = {
  es: es,
};

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const getMessagesES = () => {
  return {
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
};

export const convertEventsToDateEvents = (events: any[]): Event[] => {
  return events.map((event) => ({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  }));
};

export const isDate = (value: any) => {
  if (!value) return false;
  
  const fecha = new Date(value);
  return !isNaN(fecha.getTime());
};
