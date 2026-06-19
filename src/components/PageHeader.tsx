import { Box, Container, Title, Text, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}

/** Encabezado editorial con gradiente de marca (sin foto). */
export const PageHeader = ({ eyebrow, title, subtitle, children }: PageHeaderProps) => (
  <Box className="lm-page-header">
    <Container size="lg" py={{ base: 40, sm: 56 }}>
      <Stack gap="sm" maw={640}>
        {eyebrow && <Text className="lm-eyebrow lm-eyebrow--light">{eyebrow}</Text>}
        <Title
          order={1}
          fw={700}
          c="white"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
          }}
        >
          {title}
        </Title>
        {subtitle && (
          <Text size="md" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.65 }}>
            {subtitle}
          </Text>
        )}
        {children}
      </Stack>
    </Container>
  </Box>
);
