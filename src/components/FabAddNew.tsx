'use client';

import { ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { useCalendarCreateAction } from '@/hooks/useCalendarCreateAction';

/** FAB de crear/editar — solo en desktop; en mobile va en la bottom nav. */
export const FabAddNew = () => {
  const { handleCreateOrEdit, isEditMode, isDateModalOpen } = useCalendarCreateAction();

  if (isDateModalOpen) return null;

  return (
    <ActionIcon
      className="fab"
      size={70}
      radius="xl"
      color={isEditMode ? 'green' : 'brand'}
      variant="filled"
      onClick={handleCreateOrEdit}
    >
      {isEditMode ? <IconEdit size={30} /> : <IconPlus size={30} />}
    </ActionIcon>
  );
};
