import { create } from 'zustand';
import { AuthState, User } from '@/types';

interface AuthStore extends AuthState {
  onChecking: () => void;
  onLogin: (user: User) => void;
  onLogout: (errorMessage?: string) => void;
  clearErrorMessage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  status: 'checking',
  user: null,
  errorMessage: null,

  // Actions
  onChecking: () => set({
    status: 'checking',
    user: null,
    errorMessage: null,
  }),

  onLogin: (user: User) => set({
    status: 'authenticated',
    user,
    errorMessage: null,
  }),

  onLogout: (errorMessage?: string) => set({
    status: 'not-authenticated',
    user: null,
    errorMessage: errorMessage || null,
  }),

  clearErrorMessage: () => set({
    errorMessage: null,
  }),
}));
