import { Box, Container, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';

interface Step {
  icon: ReactNode;
  title: string;
  description: string;
}

interface StepsRowProps {
  eyebrow: string;
  title: string;
  steps: Step[];
}

export const StepsRow = ({ eyebrow, title, steps }: StepsRowProps) => (
  <Box className="lm-section lm-section--alt">
    <Container size="lg" py={{ base: 48, sm: 64 }}>
      <SectionHeader eyebrow={eyebrow} title={title} align="center" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {steps.map((step, i) => (
          <Box key={step.title} className="lm-step">
            <Text className="lm-step__num">0{i + 1}</Text>
            <ThemeIcon size={44} radius="md" variant="light" color="brand" mb="sm">
              {step.icon}
            </ThemeIcon>
            <Text fw={700} size="md" mb={6} style={{ letterSpacing: '-0.01em' }}>
              {step.title}
            </Text>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              {step.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  </Box>
);
