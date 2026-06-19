'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components';
import {
  TextInput,
  Button,
  Text,
  Anchor,
  Stack,
  ThemeIcon,
} from '@mantine/core';
import { IconMailCheck } from '@tabler/icons-react';

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !validateEmail(email)) {
      setError('Ingresá un email válido');
      return;
    }
    setError(undefined);
    setIsLoading(true);

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard title="Revisá tu correo">
        <Stack align="center" gap="md">
          <ThemeIcon size={56} radius="xl" variant="light" color="brand">
            <IconMailCheck size={30} />
          </ThemeIcon>
          <Text size="sm" ta="center" c="dimmed">
            Si el email está registrado, te enviamos un enlace para crear una
            nueva contraseña. Revisá tu casilla (y el spam).
          </Text>
          <Anchor component={Link} href="/login" size="sm" fw={500}>
            Volver al inicio de sesión
          </Anchor>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te enviamos un enlace para restablecerla"
      footer={
        <Anchor component={Link} href="/login" size="sm">
          Volver al inicio de sesión
        </Anchor>
      }
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <TextInput
            label="Correo electrónico"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.currentTarget.value);
              if (error) setError(undefined);
            }}
            disabled={isLoading}
            error={error}
            required
            type="email"
            autoComplete="email"
          />

          <Button type="submit" fullWidth mt="md" size="md" loading={isLoading} disabled={isLoading}>
            Enviar enlace
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
