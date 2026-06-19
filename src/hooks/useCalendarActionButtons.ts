'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useCalendarStore } from '@/hooks';
import { useCalendarCreateAction } from '@/hooks/useCalendarCreateAction';
import { scheduleUiLockRelease, waitForModalClose } from '@/lib/releaseUiLocks';
import { useUiStore as useUiStoreZustand } from '@/stores/useUiStore';

const LONG_PRESS_MS = 3000;

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
  const { startDeletingEvent, setActiveEvent } = useCalendarStore();
  const [showDelete, setShowDelete] = useState(false);
  const [holding, setHolding] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextClick = useRef(false);

  useEffect(() => {
    if (!isEditMode) setShowDelete(false);
  }, [isEditMode]);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setHolding(false);
  }, []);

  const onPressStart = useCallback(() => {
    if (!isEditMode || isDateModalOpen) return;
    setHolding(true);
    pressTimer.current = setTimeout(() => {
      setShowDelete(true);
      setHolding(false);
      skipNextClick.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_MS);
  }, [isEditMode, isDateModalOpen]);

  const onPressEnd = useCallback(() => {
    clearPressTimer();
  }, [clearPressTimer]);

  const handlePrimaryClick = useCallback(async () => {
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }

    if (showDelete) {
      const deleted = await confirmDeleteReservation(startDeletingEvent);
      if (!deleted) return;

      setActiveEvent(null);
      setShowDelete(false);
      return;
    }

    handleCreateOrEdit();
  }, [showDelete, startDeletingEvent, setActiveEvent, handleCreateOrEdit]);

  const primaryLabel = showDelete
    ? 'Eliminar'
    : isEditMode
      ? 'Editar'
      : 'Crear';

  return {
    isEditMode,
    isDateModalOpen,
    showDelete,
    holding,
    primaryLabel,
    onPressStart,
    onPressEnd,
    handlePrimaryClick,
  };
}
