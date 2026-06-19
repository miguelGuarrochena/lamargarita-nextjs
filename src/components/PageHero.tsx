'use client';

import Image from 'next/image';
import { Box, Container, Title, Text, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageHeroProps {
  image: string;
  imageAlt?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  size?: 'full' | 'compact';
  imagePosition?: string;
  children?: ReactNode;
}

export const PageHero = ({
  image,
  imageAlt = 'La Margarita',
  eyebrow,
  title,
  subtitle,
  size = 'compact',
  imagePosition = 'center',
  children,
}: PageHeroProps) => {
  const isFull = size === 'full';

  return (
    <Box
      className="lm-hero"
      style={{
        position: 'relative',
        overflow: 'hidden',
        color: 'white',
        minHeight: isFull ? 'clamp(380px, 56vh, 540px)' : 'clamp(180px, 24vh, 240px)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={isFull}
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: imagePosition }}
      />

      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: isFull
            ? 'linear-gradient(180deg, rgba(12,38,32,0.25) 0%, rgba(12,38,32,0.5) 50%, rgba(12,38,32,0.72) 100%)'
            : 'linear-gradient(135deg, rgba(26,143,118,0.82) 0%, rgba(12,60,50,0.78) 100%)',
        }}
      />

      <Container
        size="lg"
        py={isFull ? { base: 40, sm: 64 } : { base: 32, sm: 40 }}
        style={{ position: 'relative', width: '100%' }}
      >
        <Stack align="center" gap={isFull ? 'md' : 'xs'} maw={isFull ? 680 : 560} mx="auto">
          {eyebrow && (
            <Text
              tt="uppercase"
              fw={600}
              size="xs"
              className="lm-hero-text"
              style={{ letterSpacing: '0.14em', opacity: 0.9 }}
            >
              {eyebrow}
            </Text>
          )}

          <Title
            order={1}
            ta="center"
            fw={700}
            className="lm-hero-title"
            style={{
              fontSize: isFull
                ? 'clamp(1.75rem, 4vw, 2.75rem)'
                : 'clamp(1.4rem, 3vw, 1.9rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            {title}
          </Title>

          {subtitle && (
            <Text
              ta="center"
              size={isFull ? 'md' : 'sm'}
              className="lm-hero-text"
              maw={isFull ? 520 : 440}
              style={{ lineHeight: 1.6, opacity: 0.92 }}
            >
              {subtitle}
            </Text>
          )}

          {children}
        </Stack>
      </Container>
    </Box>
  );
};
