'use client';

import { Event } from '@/types';

interface CalendarEventProps {
  event: Event;
}

export const CalendarEvent = ({ event }: CalendarEventProps) => {
  const { title, user, pax, notes, booking } = event;

  return (
    <div>
      <strong>
        {event.booking === "FR" || event.booking === "VC"
          ? "ADMIN"
          : user?.name.toUpperCase() || 'USER'}{" "}
        -{" "}
      </strong>
      <span className="event-title">{title} | </span>
      <span>
        {booking === "CT"
          ? "Capacidad Total"
          : booking === "PA"
          ? "Reserva Parcial Ambas Casas"
          : booking === "PR"
          ? "Sólo Casa Principal"
          : booking === "CS"
          ? "Sólo Casita"
          : booking === "NC"
          ? "Reserva No Compartible"
          : booking === "FL"
          ? "Finde Libre"
          : booking === "VC"
          ? "Vacaciones"
          : "Feriado"}
      </span>
      <div>
        <small> Personas: {pax}</small>
      </div>
      {notes && <div>{notes}</div>}
    </div>
  );
};
