'use client';

import Swal from 'sweetalert2';
import { useCalendarCreateAction } from '@/hooks/useCalendarCreateAction';
import { scheduleUiLockRelease, waitForModalClose, releaseUiLocks } from '@/lib/releaseUiLocks';
import { useUiStore as useUiStoreZustand } from '@/stores/useUiStore';

type ConfirmDeleteOptions = {
  afterCloseModal?: boolean;
};

export async function confirmDeleteReservation(
  startDeletingEvent: () => Promise<boolean>,
  options?: ConfirmDeleteOptions
): Promise<boolean> {
  try {
    if (options?.afterCloseModal) {
      await waitForModalClose();
      releaseUiLocks();
    }

    const result = await Swal.fire({
      title: '¿Eliminar esta reserva?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e03131',
      allowOutsideClick: false,
    });

    if (!result.isConfirmed) return false;

    const deleted = await startDeletingEvent();
    return deleted;
  } finally {
    useUiStoreZustand.getState().onCloseDateModal();
    window.setTimeout(() => scheduleUiLockRelease(), 50);
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
