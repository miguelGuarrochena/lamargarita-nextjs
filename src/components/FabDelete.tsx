'use client';

import { useCalendarStore, useUiStore } from '@/hooks';
import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

export const FabDelete = () => {
  const { startDeletingEvent, hasEventSelected } = useCalendarStore();
  const { isDateModalOpen } = useUiStore();

  // Hide FAB when modal is open or when no event is selected to prevent overlap
  if (!hasEventSelected || isDateModalOpen) {
    return null;
  }

  const handleDelete = () => {
    startDeletingEvent();
  };

  return (
    <ActionIcon
      size={70}
      radius="xl"
      color="red"
      variant="filled"
      onClick={handleDelete}
      style={{
        position: 'fixed',
        bottom: 25,
        left: 25,
        zIndex: 150, // Reduced z-index to stay below modal
      }}
    >
      <IconTrash size={22} />
    </ActionIcon>
  );
};
