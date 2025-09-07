import { createSlice } from '@reduxjs/toolkit';
import { UiState } from '@/types';

const initialState: UiState = {
  isDateModalOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    onOpenDateModal: (state) => {
      state.isDateModalOpen = true;
    },
    onCloseDateModal: (state) => {
      state.isDateModalOpen = false;
    },
  },
});

export const { onOpenDateModal, onCloseDateModal } = uiSlice.actions;
