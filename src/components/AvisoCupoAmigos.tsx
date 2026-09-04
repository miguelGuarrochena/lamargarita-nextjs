'use client';

import { Box, Group, Text, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { avisoCupoAmigos } from '@/lib/amigosQuota';

interface Props {
  /** Valor actual del selector de tipo de invitado. Con Familiar no se muestra nada. */
  tipoInvitado?: unknown;
  /**
   * `false` solo cuando el modal sabe con certeza que esa reserva ya quedó fuera
   * de la ventana de cancelación. Ante la duda, aviso general.
   */
  cancelacionEnPlazo?: boolean;
}

/**
 * Aviso informativo (no es una alerta) que acompaña al selector de tipo de
 * invitado cuando se elige Amigos: recuerda cómo se relaciona la cancelación
 * con el cupo anual.
 *
 * Es puramente informativo: no valida nada ni condiciona el guardado. El cupo
 * lo sigue resolviendo `bloqueaPorCupoAmigos` (UX) y el backend (fuente de verdad).
 */
export const AvisoCupoAmigos = ({ tipoInvitado, cancelacionEnPlazo }: Props) => {
  const mensaje = avisoCupoAmigos({ tipoInvitado, cancelacionEnPlazo });
  if (!mensaje) return null;

  return (
    <Box
      mt="xs"
      p="xs"
      role="note"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color="gray" size={24} radius="md">
          <IconInfoCircle size={15} />
        </ThemeIcon>
        <Text size="xs" c="dimmed" lh={1.45}>
          {mensaje}
        </Text>
      </Group>
    </Box>
  );
};
