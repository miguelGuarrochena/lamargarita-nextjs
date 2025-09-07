import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice';
import { calendarSlice } from './calendarSlice';
import { uiSlice } from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    calendar: calendarSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
