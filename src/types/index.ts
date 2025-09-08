export interface User {
  uid: string;
  name: string;
  email: string;
}

export interface EventUser {
  _id: string;
  name: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  notes?: string;
  booking: BookingType;
  pax?: number;
  start: Date;
  end: Date;
  user?: EventUser;
}

// Alias for backward compatibility
export type Event = CalendarEvent;

export type BookingType = 'CT' | 'PA' | 'PR' | 'CS' | 'NC' | 'FL' | 'FR' | 'VC';

export interface AuthState {
  status: 'checking' | 'authenticated' | 'not-authenticated';
  user: User | null;
  errorMessage: string | null;
}

export interface CalendarState {
  events: Event[];
  activeEvent: Event | null;
}

export interface UiState {
  isDateModalOpen: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  msg?: string;
  data?: T;
}

export interface AuthResponse {
  ok: boolean;
  uid: string;
  name: string;
  token: string;
  msg?: string;
}

export interface EventsResponse {
  ok: boolean;
  eventos: Event[];
}
