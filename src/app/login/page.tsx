'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useAuthStore, useForm } from '@/hooks';
import { 
  Container, 
  Paper, 
  TextInput, 
  PasswordInput, 
  Button, 
  Title, 
  Text, 
  Anchor, 
  Stack,
  Center
} from '@mantine/core';

const loginFormFields = {
  loginEmail: '',
  loginPassword: '',
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export default function LoginPage() {
  const { startLogin, errorMessage, status, checkAuthToken } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const router = useRouter();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const {
    loginEmail,
    loginPassword,
    onInputChange: onLoginInputChange,
  } = useForm(loginFormFields);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!loginEmail.trim()) {
      errors.email = 'El email es requerido';
    } else if (!validateEmail(loginEmail)) {
      errors.email = 'Ingresa un email válido';
    }

    if (!loginPassword.trim()) {
      errors.password = 'La contraseña es requerida';
    } else if (!validatePassword(loginPassword)) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      await startLogin({ email: loginEmail, password: loginPassword });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLoginInputChange(event);
    // Clear field error when user starts typing
    const fieldName = event.target.name === 'loginEmail' ? 'email' : 'password';
    if (fieldErrors[fieldName as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: undefined
      }));
    }
  };

  useEffect(() => {
    checkAuthToken();
  }, [checkAuthToken]);

  useEffect(() => {
    if (errorMessage !== null) {
      Swal.fire('Error en la autenticación', errorMessage, 'error');
      setIsLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  return (
    <Container size={420} my={40}>
      <Center>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ width: '100%' }}>
          <Title ta="center" mb="xs">
            ¡Hola!
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            Bienvenido a La Margarita Reservas
          </Text>

          <form onSubmit={loginSubmit}>
            <Stack>
              <TextInput
                label="Correo electrónico"
                placeholder="tu@email.com"
                name="loginEmail"
                value={loginEmail}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.email}
                required
                type="email"
                autoComplete="email"
              />

              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                name="loginPassword"
                value={loginPassword}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.password}
                required
                autoComplete="current-password"
              />

              <Button 
                type="submit" 
                fullWidth 
                mt="xl"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </Stack>
          </form>

          <Text c="dimmed" size="sm" ta="center" mt={30}>
            ¿No tienes cuenta?{' '}
            <Anchor component={Link} href="/register" size="sm">
              Regístrate aquí
            </Anchor>
          </Text>
        </Paper>
      </Center>
    </Container>
  );
}
