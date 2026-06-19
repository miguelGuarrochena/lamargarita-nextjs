'use client';

import { useCallback } from 'react';
import { useCalendarStore, useUiStore, useAuthStore } from '@/hooks';
import { BookingType } from '@/types';

export function useCalendarCreateAction() {
  const { openDateModal, isDateModalOpen } = useUiStore();
  const { setActiveEvent, activeEvent } = useCalendarStore();
  const { user } = useAuthStore();

  const isEditMode =
    !!activeEvent &&
    !!activeEvent.id &&
    (!activeEvent.user || activeEvent.user._id === user?.uid);

  const handleCreateOrEdit = useCallback(() => {
    if (isEditMode) {
      openDateModal();
      return;
    }

    setActiveEvent({
      title: '',
      notes: '',
      start: new Date(),
      end: new Date(),
      booking: 'CT' as BookingType,
      pax: 1,
    });
    openDateModal();
  }, [isEditMode, openDateModal, setActiveEvent]);

  return { handleCreateOrEdit, isEditMode, isDateModalOpen };
}
