'use client';

import { useCalendarStore } from '@/hooks';
import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

export const FabDelete = () => {
  const { startDeletingEvent, hasEventSelected } = useCalendarStore();

  const handleDelete = () => {
    startDeletingEvent();
  };

  if (!hasEventSelected) {
    return null;
  }

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
        zIndex: 1000,
      }}
    >
      <IconTrash size={22} />
    </ActionIcon>
  );
};
