import { useAppDispatch, useAppSelector } from './useAppDispatch';
import { onOpenDateModal, onCloseDateModal } from '@/store';

export const useUiStore = () => {
  const { isDateModalOpen } = useAppSelector((state) => state.ui);
  const dispatch = useAppDispatch();

  const openDateModal = () => {
    dispatch(onOpenDateModal());
  };

  const closeDateModal = () => {
    dispatch(onCloseDateModal());
  };

  return {
    // Properties
    isDateModalOpen,

    // Methods
    openDateModal,
    closeDateModal,
  };
};
