import { useCallback } from 'react';
import { Event } from '@/types';
import { useCalendarStore as useCalendarStoreZustand } from '@/stores/useCalendarStore';
import { useAuthStore as useAuthStoreZustand } from '@/stores/useAuthStore';
import Swal from 'sweetalert2';

export const useCalendarStore = () => {
  const { events, activeEvent, onSetActiveEvent, onAddNewEvent, onUpdateEvent, onDeleteEvent, onLoadEvents } = useCalendarStoreZustand();
  const { user } = useAuthStoreZustand();

  const setActiveEvent = (calendarEvent: Event) => {
    onSetActiveEvent(calendarEvent);
  };

  const startSavingEvent = async (calendarEvent: Event) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      if (calendarEvent.id) {
        // Updating
        const response = await fetch(`/api/events/${calendarEvent.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(calendarEvent),
        });

        const data = await response.json();

        if (data.ok) {
          onUpdateEvent({ ...calendarEvent, user: user || undefined });
        } else {
          throw new Error(data.msg || 'Error al actualizar evento');
        }
      } else {
        // Creating
        const response = await fetch('/api/events', {
          method: 'POST',
          headers,
          body: JSON.stringify(calendarEvent),
        });

        const data = await response.json();

        if (data.ok) {
          onAddNewEvent({ ...calendarEvent, id: data.evento.id, user: user || undefined });
        } else {
          throw new Error(data.msg || 'Error al crear evento');
        }
      }
    } catch (error) {
      console.log('ERROR: ', error);
      Swal.fire('Error al guardar', (error as Error).message, 'error');
    }
  };

  const startDeletingEvent = async () => {
    if (!activeEvent) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${activeEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        onDeleteEvent();
      } else {
        throw new Error(data.msg || 'Error al eliminar evento');
      }
    } catch (error) {
      console.log('ERROR: ', error);
      Swal.fire('Error al eliminar', (error as Error).message, 'error');
    }
  };

  const startLoadingEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        const events = data.eventos.map((event: any) => ({
          ...event,
          id: event._id || event.id,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        onLoadEvents(events);
      }
    } catch (error) {
      console.log('Error cargando eventos');
      console.log('ERROR:', error);
    }
  }, [onLoadEvents]);

  return {
    // Properties
    activeEvent,
    events,
    hasEventSelected: !!activeEvent,

    // Methods
    startDeletingEvent,
    setActiveEvent,
    startSavingEvent,
    startLoadingEvents,
  };
};
