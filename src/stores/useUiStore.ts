import { create } from 'zustand';
import { UiState } from '@/types';

interface UiStore extends UiState {
  onOpenDateModal: () => void;
  onCloseDateModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  // Initial state
  isDateModalOpen: false,

  // Actions
  onOpenDateModal: () => set({
    isDateModalOpen: true,
  }),

  onCloseDateModal: () => set({
    isDateModalOpen: false,
  }),
}));
