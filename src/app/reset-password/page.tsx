'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Container,
  Paper,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Center,
} from '@mantine/core';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <Stack mt="md">
        <Text size="sm" ta="center" c="red">
          El enlace no es válido. Pedí uno nuevo desde la pantalla de recuperación.
        </Text>
        <Anchor component={Link} href="/forgot-password" size="sm" ta="center">
          Recuperar contraseña
        </Anchor>
      </Stack>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors: { password?: string; confirm?: string } = {};
    if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (password !== confirm) newErrors.confirm = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (data.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('token-init-date', new Date().getTime().toString());
          localStorage.setItem(
            'user',
            JSON.stringify({ name: data.name, uid: data.uid, email: data.email })
          );
        }
        await Swal.fire('¡Listo!', 'Tu contraseña fue actualizada.', 'success');
        router.push('/');
      } else {
        Swal.fire('Error', data.msg || 'No se pudo restablecer la contraseña', 'error');
      }
    } catch {
      Swal.fire('Error', 'Error de conexión. Intentá de nuevo.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <PasswordInput
          label="Nueva contraseña"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => {
            setPassword(e.currentTarget.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          disabled={isLoading}
          error={errors.password}
          required
          autoComplete="new-password"
        />
        <PasswordInput
          label="Repetir contraseña"
          placeholder="Repetí la contraseña"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.currentTarget.value);
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
          }}
          disabled={isLoading}
          error={errors.confirm}
          required
          autoComplete="new-password"
        />
        <Button type="submit" fullWidth mt="xl" loading={isLoading} disabled={isLoading}>
          Guardar nueva contraseña
        </Button>
      </Stack>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Container size={420} my={40}>
      <Center>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ width: '100%' }}>
          <Title ta="center" mb="xs">
            Nueva contraseña
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            Elegí una nueva contraseña para tu cuenta.
          </Text>
          <Suspense fallback={<Text size="sm" ta="center">Cargando...</Text>}>
            <ResetPasswordForm />
          </Suspense>
        </Paper>
      </Center>
    </Container>
  );
}
