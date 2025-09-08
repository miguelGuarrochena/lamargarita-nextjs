'use client';

import { useCalendarStore, useUiStore, useAuthStore } from '@/hooks';
import { ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { BookingType } from '@/types';

export const FabAddNew = () => {
  const { openDateModal } = useUiStore();
  const { setActiveEvent, activeEvent } = useCalendarStore();
  const { user } = useAuthStore();

  // Check if we're in edit mode (user has selected their own event)
  const isEditMode = activeEvent && activeEvent.id && (!activeEvent.user || activeEvent.user.uid === user?.uid);

  const handleClick = () => {
    if (isEditMode) {
      // Edit mode - open modal with existing event data
      openDateModal();
    } else {
      // Create mode - clear any selection and set up new event
      const newEvent = {
        title: '',
        notes: '',
        start: new Date(),
        end: new Date(),
        booking: 'CT' as BookingType,
        pax: 1,
      };
      setActiveEvent(newEvent);
      openDateModal();
    }
  };

  return (
    <ActionIcon
      className="fab"
      size={70}
      radius="xl"
      color={isEditMode ? "green" : "blue"}
      variant="filled"
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: 25,
        right: 25,
        zIndex: 1000,
      }}
    >
      {isEditMode ? <IconEdit size={30} /> : <IconPlus size={30} />}
    </ActionIcon>
  );
};
