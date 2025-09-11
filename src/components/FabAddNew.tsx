'use client';

import { useCalendarStore, useUiStore, useAuthStore } from '@/hooks';
import { ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { BookingType } from '@/types';

export const FabAddNew = () => {
  const { openDateModal, isDateModalOpen } = useUiStore();
  const { setActiveEvent, activeEvent } = useCalendarStore();
  const { user } = useAuthStore();

  // Hide FAB when modal is open to prevent overlap with modal buttons
  if (isDateModalOpen) return null;

  // Check if we're in edit mode (user has selected their own event)
  // Fixed: Use _id from EventUser instead of uid
  const isEditMode = activeEvent && activeEvent.id && (!activeEvent.user || activeEvent.user._id === user?.uid);

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
        zIndex: 150, // Reduced z-index to stay below modal
      }}
    >
      {isEditMode ? <IconEdit size={30} /> : <IconPlus size={30} />}
    </ActionIcon>
  );
};
