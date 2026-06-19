'use client';

import Swal from 'sweetalert2';
import { useCalendarCreateAction } from '@/hooks/useCalendarCreateAction';
import { scheduleUiLockRelease, waitForModalClose } from '@/lib/releaseUiLocks';
import { useUiStore as useUiStoreZustand } from '@/stores/useUiStore';

type ConfirmDeleteOptions = {
  afterCloseModal?: boolean;
};

export async function confirmDeleteReservation(
  startDeletingEvent: () => Promise<void>,
  options?: ConfirmDeleteOptions
): Promise<boolean> {
  try {
    if (options?.afterCloseModal) {
      await waitForModalClose();
    }

    const result = await Swal.fire({
      title: '¿Eliminar esta reserva?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e03131',
    });

    if (!result.isConfirmed) return false;

    await startDeletingEvent();
    return true;
  } finally {
    useUiStoreZustand.getState().onCloseDateModal();
    scheduleUiLockRelease();
  }
}

export function useCalendarActionButtons() {
  const { handleCreateOrEdit, isEditMode, isDateModalOpen } = useCalendarCreateAction();

  return {
    isEditMode,
    isDateModalOpen,
    primaryLabel: isEditMode ? 'Editar' : 'Crear',
    handlePrimaryClick: handleCreateOrEdit,
  };
}
