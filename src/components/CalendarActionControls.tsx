'use client';

import { Button, Box, Text, UnstyledButton } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { useCalendarActionButtons } from '@/hooks/useCalendarActionButtons';

interface CalendarActionControlsProps {
  variant: 'navbar' | 'bottom-nav';
}

export const CalendarActionControls = ({ variant }: CalendarActionControlsProps) => {
  const {
    isEditMode,
    isDateModalOpen,
    showDelete,
    holding,
    primaryLabel,
    onPressStart,
    onPressEnd,
    handlePrimaryClick,
  } = useCalendarActionButtons();

  if (isDateModalOpen) {
    return variant === 'bottom-nav' ? <Box className="lm-bottom-nav__item" aria-hidden /> : null;
  }

  const icon = showDelete ? (
    <IconTrash size={variant === 'navbar' ? 15 : 22} stroke={2.2} />
  ) : isEditMode ? (
    <IconEdit size={variant === 'navbar' ? 15 : 22} stroke={2.2} />
  ) : (
    <IconPlus size={variant === 'navbar' ? 15 : 24} stroke={2.4} />
  );

  if (variant === 'navbar') {
    return (
      <Button
        size="compact-sm"
        color={showDelete ? 'red' : 'brand'}
        variant="filled"
        leftSection={icon}
        onClick={handlePrimaryClick}
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerLeave={onPressEnd}
        onPointerCancel={onPressEnd}
        onContextMenu={(e) => e.preventDefault()}
        ml={4}
        visibleFrom="sm"
        title={isEditMode && !showDelete ? 'Mantené 3s para eliminar' : undefined}
      >
        {primaryLabel}
      </Button>
    );
  }

  return (
    <UnstyledButton
      className={`lm-bottom-nav__create${showDelete ? ' lm-bottom-nav__create--danger' : ''}`}
      onClick={handlePrimaryClick}
      onPointerDown={onPressStart}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
      onPointerCancel={onPressEnd}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={primaryLabel}
    >
      <Box className="lm-bottom-nav__create-icon">
        {icon}
      </Box>
      <Text size="10px" fw={700} mt={2} c={showDelete ? 'red.7' : undefined}>
        {holding && isEditMode && !showDelete ? '...' : primaryLabel}
      </Text>
    </UnstyledButton>
  );
};
