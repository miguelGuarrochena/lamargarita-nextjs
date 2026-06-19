'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Paper, Title, Text, Box, Anchor, Group } from '@mantine/core';
import { BrandLockup } from './BrandLockup';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthCard = ({ title, subtitle, children, footer }: AuthCardProps) => {
  return (
    <Box
      className="lm-auth-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <Box style={{ width: '100%', maxWidth: 400 }}>
        <Group justify="center" mb="xl">
          <Anchor component={Link} href="/login" underline="never">
            <BrandLockup logoSize={42} variant="auth" />
          </Anchor>
        </Group>

        <Paper className="lm-card" p={{ base: 24, sm: 32 }} radius="lg">
          <Title order={2} ta="center" fw={700} size="h3" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" size="sm" ta="center" mt={6} mb={24}>
              {subtitle}
            </Text>
          )}
          <Box mt={subtitle ? 0 : 18}>{children}</Box>
        </Paper>

        {footer && (
          <Text c="dimmed" size="sm" ta="center" mt="lg">
            {footer}
          </Text>
        )}
      </Box>
    </Box>
  );
};
