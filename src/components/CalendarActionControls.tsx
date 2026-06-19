'use client';

import { Button, Box, Text, UnstyledButton } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { useCalendarActionButtons } from '@/hooks/useCalendarActionButtons';

interface CalendarActionControlsProps {
  variant: 'navbar' | 'bottom-nav';
}

export const CalendarActionControls = ({ variant }: CalendarActionControlsProps) => {
  const { isEditMode, isDateModalOpen, primaryLabel, handlePrimaryClick } =
    useCalendarActionButtons();

  if (isDateModalOpen) {
    return variant === 'bottom-nav' ? <Box className="lm-bottom-nav__item" aria-hidden /> : null;
  }

  const icon = isEditMode ? (
    <IconEdit size={variant === 'navbar' ? 15 : 22} stroke={2.2} />
  ) : (
    <IconPlus size={variant === 'navbar' ? 15 : 24} stroke={2.4} />
  );

  if (variant === 'navbar') {
    return (
      <Button
        size="compact-sm"
        color="brand"
        variant="filled"
        leftSection={icon}
        onClick={handlePrimaryClick}
        ml={4}
        visibleFrom="sm"
      >
        {primaryLabel}
      </Button>
    );
  }

  return (
    <UnstyledButton
      className="lm-bottom-nav__create"
      onClick={handlePrimaryClick}
      aria-label={primaryLabel}
    >
      <Box className="lm-bottom-nav__create-icon">
        {icon}
      </Box>
      <Text size="10px" fw={700} mt={2}>
        {primaryLabel}
      </Text>
    </UnstyledButton>
  );
};
