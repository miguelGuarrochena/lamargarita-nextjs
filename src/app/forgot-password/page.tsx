'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Paper,
  TextInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Center,
} from '@mantine/core';

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
      // Siempre mostramos confirmación, exista o no el email.
      setSent(true);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Center>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ width: '100%' }}>
          <Title ta="center" mb="xs">
            Recuperar contraseña
          </Title>

          {sent ? (
            <Stack mt="md">
              <Text size="sm" ta="center">
                Si el email está registrado, te enviamos un enlace para crear una
                nueva contraseña. Revisá tu casilla (y el spam).
              </Text>
              <Anchor component={Link} href="/login" size="sm" ta="center">
                Volver al inicio de sesión
              </Anchor>
            </Stack>
          ) : (
            <>
              <Text c="dimmed" size="sm" ta="center" mb={30}>
                Ingresá tu email y te enviamos un enlace para restablecerla.
              </Text>

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

                  <Button type="submit" fullWidth mt="xl" loading={isLoading} disabled={isLoading}>
                    Enviar enlace
                  </Button>
                </Stack>
              </form>

              <Text c="dimmed" size="sm" ta="center" mt={30}>
                <Anchor component={Link} href="/login" size="sm">
                  Volver al inicio de sesión
                </Anchor>
              </Text>
            </>
          )}
        </Paper>
      </Center>
    </Container>
  );
}
