import { create } from 'zustand';
import { CalendarState, Event } from '@/types';

interface CalendarStore extends CalendarState {
  onSetActiveEvent: (event: Event) => void;
  onAddNewEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: () => void;
  onLoadEvents: (events: Event[]) => void;
  onLogoutCalendar: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  events: [],
  activeEvent: null,

  // Actions
  onSetActiveEvent: (event: Event) => set({
    activeEvent: event,
  }),

  onAddNewEvent: (event: Event) => set((state) => ({
    events: [...state.events, event],
    activeEvent: null,
  })),

  onUpdateEvent: (event: Event) => set((state) => ({
    events: state.events.map((e) => e.id === event.id ? event : e),
    activeEvent: null,
  })),

  onDeleteEvent: () => set((state) => {
    if (state.activeEvent) {
      return {
        events: state.events.filter((event) => event.id !== state.activeEvent!.id),
        activeEvent: null,
      };
    }
    return state;
  }),

  onLoadEvents: (events: Event[] = []) => set({
    events,
  }),

  onLogoutCalendar: () => set({
    events: [],
    activeEvent: null,
  }),
}));
