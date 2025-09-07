import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '@/types';

const initialState: AuthState = {
  status: 'checking',
  user: null,
  errorMessage: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    onChecking: (state) => {
      state.status = 'checking';
      state.user = null;
      state.errorMessage = null;
    },
    onLogin: (state, { payload }: PayloadAction<User>) => {
      state.status = 'authenticated';
      state.user = payload;
      state.errorMessage = null;
    },
    onLogout: (state, { payload }: PayloadAction<string | undefined>) => {
      state.status = 'not-authenticated';
      state.user = null;
      state.errorMessage = payload || null;
    },
    clearErrorMessage: (state) => {
      state.errorMessage = null;
    },
  },
});

export const { onChecking, onLogin, onLogout, clearErrorMessage } = authSlice.actions;
