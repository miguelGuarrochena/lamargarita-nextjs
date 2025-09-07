import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CalendarState, Event } from '@/types';

const initialState: CalendarState = {
  events: [],
  activeEvent: null,
};

export const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    onSetActiveEvent: (state, { payload }: PayloadAction<Event>) => {
      state.activeEvent = payload;
    },
    onAddNewEvent: (state, { payload }: PayloadAction<Event>) => {
      state.events.push(payload);
      state.activeEvent = null;
    },
    onUpdateEvent: (state, { payload }: PayloadAction<Event>) => {
      state.events = state.events.map((event) => {
        if (event.id === payload.id) {
          return payload;
        }
        return event;
      });
    },
    onDeleteEvent: (state) => {
      if (state.activeEvent) {
        state.events = state.events.filter(
          (event) => event.id !== state.activeEvent!.id
        );
        state.activeEvent = null;
      }
    },
    onLoadEvents: (state, { payload = [] }: PayloadAction<Event[]>) => {
      state.events = payload;
    },
    onLogoutCalendar: (state) => {
      state.events = [];
      state.activeEvent = null;
    },
  },
});

export const {
  onSetActiveEvent,
  onAddNewEvent,
  onUpdateEvent,
  onDeleteEvent,
  onLoadEvents,
  onLogoutCalendar,
} = calendarSlice.actions;
