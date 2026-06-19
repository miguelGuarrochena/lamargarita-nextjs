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
      className="fab-danger"
      size={70}
      radius="xl"
      color="red"
      variant="filled"
      onClick={handleDelete}
    >
      <IconTrash size={22} />
    </ActionIcon>
  );
};
