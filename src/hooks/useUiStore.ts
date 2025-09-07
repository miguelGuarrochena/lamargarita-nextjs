import { useUiStore as useUiStoreZustand } from '@/stores/useUiStore';

export const useUiStore = () => {
  const { isDateModalOpen, onOpenDateModal, onCloseDateModal } = useUiStoreZustand();

  const openDateModal = () => {
    onOpenDateModal();
  };

  const closeDateModal = () => {
    onCloseDateModal();
  };

  return {
    // Properties
    isDateModalOpen,

    // Methods
    openDateModal,
    closeDateModal,
  };
};
