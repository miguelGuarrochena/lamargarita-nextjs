import { Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
}

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeaderProps) => (
  <Stack gap="xs" mb="xl" align={align === 'center' ? 'center' : 'flex-start'}>
    <Text className="lm-eyebrow" ta={align}>
      {eyebrow}
    </Text>
    <Title
      order={2}
      fw={700}
      ta={align}
      style={{
        fontSize: 'clamp(1.5rem, 3vw, 2rem)',
        letterSpacing: '-0.03em',
        lineHeight: 1.15,
      }}
    >
      {title}
    </Title>
    {description && (
      <Text c="dimmed" size="md" maw={560} ta={align} style={{ lineHeight: 1.6 }}>
        {description}
      </Text>
    )}
  </Stack>
);
