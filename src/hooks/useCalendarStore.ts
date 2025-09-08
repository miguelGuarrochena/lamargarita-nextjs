import { useCallback } from 'react';
import { Event } from '@/types';
import { useCalendarStore as useCalendarStoreZustand } from '@/stores/useCalendarStore';
import { useAuthStore as useAuthStoreZustand } from '@/stores/useAuthStore';
import { ClientErrorHandler, ERROR_MESSAGES } from '@/lib/errorHandler';
import Swal from 'sweetalert2';

export const useCalendarStore = () => {
  const { events, activeEvent, onSetActiveEvent, onAddNewEvent, onUpdateEvent, onDeleteEvent, onLoadEvents } = useCalendarStoreZustand();
  const { user } = useAuthStoreZustand();

  const setActiveEvent = (calendarEvent: Event | null) => {
    onSetActiveEvent(calendarEvent);
  };

  const startSavingEvent = async (calendarEvent: Event) => {
    try {
      // Client-side validation
      if (!calendarEvent.title || calendarEvent.title.trim() === '') {
        const { userMessage, technicalMessage } = ClientErrorHandler.handleValidationError('title', calendarEvent.title);
        ClientErrorHandler.logError(
          new Error('Title validation failed'),
          'startSavingEvent - Validation',
          { calendarEvent }
        );
        Swal.fire('Error de validación', userMessage, 'error');
        return;
      }

      if (!calendarEvent.start || !calendarEvent.end) {
        const { userMessage, technicalMessage } = ClientErrorHandler.handleValidationError('dates', { start: calendarEvent.start, end: calendarEvent.end });
        ClientErrorHandler.logError(
          new Error('Date validation failed'),
          'startSavingEvent - Validation',
          { calendarEvent }
        );
        Swal.fire('Error de validación', userMessage, 'error');
        return;
      }

      // Validate date range - allow same-day bookings
      const startDate = new Date(calendarEvent.start);
      const endDate = new Date(calendarEvent.end);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      
      // Check if start date is in the past
      if (startDate < today) {
        ClientErrorHandler.logError(
          new Error('Start date cannot be in the past'),
          'startSavingEvent - Validation',
          { calendarEvent, startDate, today }
        );
        Swal.fire('Error de validación', 'La fecha de entrada no puede ser anterior a hoy', 'error');
        return;
      }
      
      if (endDate < startDate) {
        ClientErrorHandler.logError(
          new Error('Invalid date range'),
          'startSavingEvent - Validation',
          { calendarEvent, startDate, endDate }
        );
        Swal.fire('Error de validación', ERROR_MESSAGES.USER.END_BEFORE_START, 'error');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        ClientErrorHandler.logError(
          new Error('No authentication token found'),
          'startSavingEvent - Authentication',
          { calendarEvent }
        );
        Swal.fire('Error de autenticación', ERROR_MESSAGES.USER.AUTHENTICATION, 'error');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      let response: Response;
      let operation: string;

      if (calendarEvent.id) {
        // Updating
        operation = 'update event';
        response = await fetch(`/api/events/${calendarEvent.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(calendarEvent),
        });
      } else {
        // Creating
        operation = 'create event';
        response = await fetch('/api/events', {
          method: 'POST',
          headers,
          body: JSON.stringify(calendarEvent),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          errorData,
          calendarEvent.id ? ERROR_MESSAGES.USER.EVENT_UPDATE_FAILED : ERROR_MESSAGES.USER.EVENT_CREATE_FAILED
        );

        ClientErrorHandler.logError(
          new Error(`API ${operation} failed`),
          'startSavingEvent - API Error',
          { 
            calendarEvent,
            response: {
              status: response.status,
              statusText: response.statusText,
              errorData
            }
          }
        );

        Swal.fire('Error al guardar', userMessage, 'error');
        return;
      }

      const data = await response.json();

      if (data.ok) {
        if (calendarEvent.id) {
          onUpdateEvent({ ...calendarEvent, user: user || undefined });
        } else {
          onAddNewEvent({ ...calendarEvent, id: data.evento.id || data.evento._id, user: user || undefined });
        }
      } else {
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          data,
          calendarEvent.id ? ERROR_MESSAGES.USER.EVENT_UPDATE_FAILED : ERROR_MESSAGES.USER.EVENT_CREATE_FAILED
        );

        ClientErrorHandler.logError(
          new Error(`API ${operation} returned error`),
          'startSavingEvent - API Response Error',
          { calendarEvent, responseData: data }
        );

        Swal.fire('Error al guardar', userMessage, 'error');
      }
    } catch (error) {
      const operation = calendarEvent.id ? 'update event' : 'create event';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const { userMessage, technicalMessage } = ClientErrorHandler.handleNetworkError(error, operation);
        ClientErrorHandler.logError(error, 'startSavingEvent - Network Error', { calendarEvent });
        Swal.fire('Error de conexión', userMessage, 'error');
      } else {
        ClientErrorHandler.logError(error, 'startSavingEvent - Unexpected Error', { calendarEvent });
        const userMessage = calendarEvent.id ? ERROR_MESSAGES.USER.EVENT_UPDATE_FAILED : ERROR_MESSAGES.USER.EVENT_CREATE_FAILED;
        Swal.fire('Error inesperado', userMessage, 'error');
      }
    }
  };

  const startDeletingEvent = async () => {
    if (!activeEvent) {
      ClientErrorHandler.logError(
        new Error('No active event to delete'),
        'startDeletingEvent - Validation',
        { activeEvent }
      );
      Swal.fire('Error', 'No hay evento seleccionado para eliminar', 'error');
      return;
    }

    // Validate event ID
    if (!activeEvent.id || activeEvent.id === 'undefined' || activeEvent.id.trim() === '') {
      const { userMessage, technicalMessage } = ClientErrorHandler.handleValidationError('eventId', activeEvent.id);
      ClientErrorHandler.logError(
        new Error('Invalid event ID for deletion'),
        'startDeletingEvent - Validation',
        { activeEvent }
      );
      Swal.fire('Error de validación', userMessage, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        ClientErrorHandler.logError(
          new Error('No authentication token found'),
          'startDeletingEvent - Authentication',
          { activeEvent }
        );
        Swal.fire('Error de autenticación', ERROR_MESSAGES.USER.AUTHENTICATION, 'error');
        return;
      }

      const response = await fetch(`/api/events/${activeEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          errorData,
          ERROR_MESSAGES.USER.EVENT_DELETE_FAILED
        );

        ClientErrorHandler.logError(
          new Error('API delete event failed'),
          'startDeletingEvent - API Error',
          { 
            activeEvent,
            response: {
              status: response.status,
              statusText: response.statusText,
              errorData
            }
          }
        );

        Swal.fire('Error al eliminar', userMessage, 'error');
        return;
      }

      const data = await response.json();

      if (data.ok) {
        onDeleteEvent();
      } else {
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          data,
          ERROR_MESSAGES.USER.EVENT_DELETE_FAILED
        );

        ClientErrorHandler.logError(
          new Error('API delete event returned error'),
          'startDeletingEvent - API Response Error',
          { activeEvent, responseData: data }
        );

        Swal.fire('Error al eliminar', userMessage, 'error');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const { userMessage, technicalMessage } = ClientErrorHandler.handleNetworkError(error, 'delete event');
        ClientErrorHandler.logError(error, 'startDeletingEvent - Network Error', { activeEvent });
        Swal.fire('Error de conexión', userMessage, 'error');
      } else {
        ClientErrorHandler.logError(error, 'startDeletingEvent - Unexpected Error', { activeEvent });
        Swal.fire('Error inesperado', ERROR_MESSAGES.USER.EVENT_DELETE_FAILED, 'error');
      }
    }
  };

  const startLoadingEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        ClientErrorHandler.logError(
          new Error('No authentication token found'),
          'startLoadingEvents - Authentication'
        );
        // Don't show error for loading events without token - user might not be logged in
        return;
      }

      const response = await fetch('/api/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          errorData,
          ERROR_MESSAGES.USER.EVENT_LOAD_FAILED
        );

        ClientErrorHandler.logError(
          new Error('API load events failed'),
          'startLoadingEvents - API Error',
          { 
            response: {
              status: response.status,
              statusText: response.statusText,
              errorData
            }
          }
        );

        // Only show error if it's not an authentication issue
        if (response.status !== 401) {
          Swal.fire('Error al cargar eventos', userMessage, 'error');
        }
        return;
      }

      const data = await response.json();

      if (data.ok) {
        // Filter out events with invalid IDs and process dates
        const validEvents = data.eventos
          .filter((event: any) => {
            const eventId = event._id || event.id;
            const isValidId = eventId && eventId !== 'undefined' && typeof eventId === 'string' && eventId.trim() !== '';
            
            if (!isValidId) {
              ClientErrorHandler.logError(
                new Error('Event with invalid ID filtered out'),
                'startLoadingEvents - Data Processing',
                { event, eventId }
              );
            }
            
            return isValidId;
          })
          .map((event: any) => ({
            ...event,
            id: event._id || event.id,
            start: new Date(event.start),
            end: new Date(event.end),
          }));

        onLoadEvents(validEvents);
      } else {
        const { userMessage, technicalMessage } = ClientErrorHandler.parseApiError(
          data,
          ERROR_MESSAGES.USER.EVENT_LOAD_FAILED
        );

        ClientErrorHandler.logError(
          new Error('API load events returned error'),
          'startLoadingEvents - API Response Error',
          { responseData: data }
        );

        Swal.fire('Error al cargar eventos', userMessage, 'error');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const { userMessage, technicalMessage } = ClientErrorHandler.handleNetworkError(error, 'load events');
        ClientErrorHandler.logError(error, 'startLoadingEvents - Network Error');
        Swal.fire('Error de conexión', userMessage, 'error');
      } else {
        ClientErrorHandler.logError(error, 'startLoadingEvents - Unexpected Error');
        Swal.fire('Error inesperado', ERROR_MESSAGES.USER.EVENT_LOAD_FAILED, 'error');
      }
    }
  }, [onLoadEvents]);

  return {
    // Properties
    activeEvent,
    events,
    hasEventSelected: !!activeEvent && (!activeEvent.user || activeEvent.user.uid === user?.uid),

    // Methods
    startDeletingEvent,
    setActiveEvent,
    startSavingEvent,
    startLoadingEvents,
  };
};
