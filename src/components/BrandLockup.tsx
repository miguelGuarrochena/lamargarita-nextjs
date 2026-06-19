import { Group, Stack, Text } from '@mantine/core';
import { DaisyLogo } from './DaisyLogo';

interface BrandLockupProps {
  logoSize?: number;
  /** 'nav' = tipografía profesional. 'auth' = caligrafía decorativa. */
  variant?: 'nav' | 'auth';
  /** Para fondos oscuros (panel de auth). */
  light?: boolean;
}

/** Logo + nombre de marca unificados. */
export const BrandLockup = ({ logoSize = 34, variant = 'nav', light = false }: BrandLockupProps) => {
  if (variant === 'auth') {
    return (
      <Group gap="sm" align="center">
        <DaisyLogo size={logoSize} variant="mark" />
        <Text
          className="lm-script-fancy"
          c={light ? 'white' : 'brand.7'}
          style={{ fontSize: '2rem', lineHeight: 1 }}
        >
          La Margarita
        </Text>
      </Group>
    );
  }

  return (
    <Group gap="sm" align="center">
      <DaisyLogo size={logoSize} variant="mark" />
      <Stack gap={0}>
        <Text
          fw={600}
          size="sm"
          lh={1.15}
          style={{
            fontFamily: 'var(--font-heading), sans-serif',
            letterSpacing: '-0.02em',
            color: light ? 'white' : 'var(--lm-text)',
          }}
        >
          La Margarita
        </Text>
        <Text
          size="xs"
          tt="uppercase"
          fw={600}
          c={light ? undefined : 'dimmed'}
          style={{
            letterSpacing: '0.12em',
            fontSize: 10,
            color: light ? 'rgba(255,255,255,0.7)' : undefined,
          }}
        >
          Reservas
        </Text>
      </Stack>
    </Group>
  );
};
