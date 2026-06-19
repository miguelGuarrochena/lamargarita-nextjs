import { Text, type TextProps } from '@mantine/core';

interface BrandNameProps extends Omit<TextProps, 'children'> {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: '1.35rem',
  md: '1.65rem',
  lg: '2.1rem',
};

/** Nombre de marca en caligrafía (Great Vibes). */
export const BrandName = ({ size = 'md', ...props }: BrandNameProps) => (
  <Text
    className="lm-script-fancy"
    c="dark.7"
    style={{ fontSize: sizes[size], lineHeight: 1 }}
    {...props}
  >
    La Margarita
  </Text>
);
