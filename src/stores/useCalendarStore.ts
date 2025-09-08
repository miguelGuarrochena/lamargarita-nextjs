import { create } from 'zustand';
import { CalendarState, Event } from '@/types';

interface CalendarStore extends CalendarState {
  isLoadingEvents: boolean;
  onSetActiveEvent: (event: Event | null) => void;
  onAddNewEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: () => void;
  onLoadEvents: (events: Event[]) => void;
  onSetLoadingEvents: (loading: boolean) => void;
  onLogoutCalendar: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  events: [],
  activeEvent: null,
  isLoadingEvents: false,

  // Actions
  onSetActiveEvent: (event: Event | null) => set({
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

  onSetLoadingEvents: (loading: boolean) => set({
    isLoadingEvents: loading,
  }),

  onLogoutCalendar: () => set({
    events: [],
    activeEvent: null,
    isLoadingEvents: false,
  }),
}));
