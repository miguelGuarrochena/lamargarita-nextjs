'use client';

import { useCalendarStore, useUiStore } from '@/hooks';
import { ActionIcon } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export const FabAddNew = () => {
  const { openDateModal } = useUiStore();
  const { setActiveEvent } = useCalendarStore();

  const handleClickNew = () => {
    setActiveEvent({
      title: '',
      notes: '',
      start: new Date(),
      end: new Date(),
      booking: 'CT',
      pax: 1,
    });
    openDateModal();
  };

  return (
    <ActionIcon
      className="fab"
      size={70}
      radius="xl"
      color="blue"
      variant="filled"
      onClick={handleClickNew}
      style={{
        position: 'fixed',
        bottom: 25,
        right: 25,
        zIndex: 1000,
      }}
    >
      <IconPlus size={30} />
    </ActionIcon>
  );
};
