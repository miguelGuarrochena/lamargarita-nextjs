import { Group, Text } from '@mantine/core';
import { DaisyLogo } from './DaisyLogo';

interface BrandLockupProps {
  logoSize?: number;
  /** Texto de marca un poco más grande (p. ej. cabecera de auth). */
  prominent?: boolean;
  /** Para fondos oscuros. */
  light?: boolean;
}

/** Logo + nombre de marca unificados — caligrafía en todo el sitio. */
export const BrandLockup = ({ logoSize = 34, prominent = false, light = false }: BrandLockupProps) => {
  const nameSize = prominent ? '2rem' : '1.35rem';

  return (
    <Group gap="sm" align="center">
      <DaisyLogo size={logoSize} variant="mark" />
      <Text
        className="lm-script-fancy"
        c={light ? 'white' : 'brand.7'}
        style={{ fontSize: nameSize, lineHeight: 1 }}
      >
        La Margarita
      </Text>
    </Group>
  );
};
