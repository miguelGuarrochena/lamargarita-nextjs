'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Box, Container, Title, Text, Stack, Group, Button } from '@mantine/core';
import { IconArrowRight, IconChecklist } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface EditorialHeroProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  image: string;
  imageAlt?: string;
}

export const EditorialHero = ({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt = 'La Margarita',
}: EditorialHeroProps) => (
  <Box className="lm-editorial-hero">
    <Container size="lg" py={{ base: 48, sm: 72 }}>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(32px, 5vw, 48px)',
          alignItems: 'center',
        }}
      >
        <Stack gap="lg" maw={520}>
          <Text className="lm-eyebrow">{eyebrow}</Text>
          <Title
            order={1}
            fw={700}
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              color: 'var(--lm-text)',
            }}
          >
            {title}
          </Title>
          <Text size="lg" c="dimmed" style={{ lineHeight: 1.65 }}>
            {subtitle}
          </Text>
          <Group gap="sm" mt="xs">
            <Button
              component={Link}
              href="/calendar"
              size="md"
              rightSection={<IconArrowRight size={16} />}
            >
              Hacer una reserva
            </Button>
            <Button
              component={Link}
              href="/checklist"
              size="md"
              variant="light"
              color="brand"
              leftSection={<IconChecklist size={16} />}
            >
              Checklist
            </Button>
          </Group>
        </Stack>

        <Box className="lm-editorial-hero__image">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
        </Box>
      </Box>
    </Container>
  </Box>
);
