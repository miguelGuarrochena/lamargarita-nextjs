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

const registerFormFields = {
  registerName: '',
  registerEmail: '',
  registerPassword: '',
  registerPassword2: '',
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export default function RegisterPage() {
  const { startRegister, errorMessage, status, checkAuthToken } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const router = useRouter();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const {
    registerEmail,
    registerName,
    registerPassword,
    registerPassword2,
    onInputChange: onRegisterInputChange,
  } = useForm(registerFormFields);

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!registerName.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (!validateName(registerName)) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!registerEmail.trim()) {
      errors.email = 'El email es requerido';
    } else if (!validateEmail(registerEmail)) {
      errors.email = 'Ingresa un email válido';
    }

    if (!registerPassword.trim()) {
      errors.password = 'La contraseña es requerida';
    } else if (!validatePassword(registerPassword)) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!registerPassword2.trim()) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (registerPassword !== registerPassword2) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const registerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      await startRegister({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRegisterInputChange(event);
    // Clear field error when user starts typing
    const fieldName = event.target.name.replace('register', '').toLowerCase();
    const errorKey = fieldName === 'password2' ? 'confirmPassword' : fieldName;
    
    if (fieldErrors[errorKey as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  useEffect(() => {
    checkAuthToken();
  }, [checkAuthToken]);

  useEffect(() => {
    if (errorMessage !== null) {
      Swal.fire('Error en el registro', errorMessage, 'error');
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
            Crear Cuenta
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            Unite a La Margarita Reservas
          </Text>

          <form onSubmit={registerSubmit}>
            <Stack>
              <TextInput
                label="Nombre"
                placeholder="Tu nombre o alias"
                name="registerName"
                value={registerName}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.name}
                required
                autoComplete="name"
              />

              <TextInput
                label="Correo electrónico"
                placeholder="tu@email.com"
                name="registerEmail"
                value={registerEmail}
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
                name="registerPassword"
                value={registerPassword}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
              />

              <PasswordInput
                label="Confirmar contraseña"
                placeholder="Confirma tu contraseña"
                name="registerPassword2"
                value={registerPassword2}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.confirmPassword}
                required
                autoComplete="new-password"
              />

              <Button 
                type="submit" 
                fullWidth 
                mt="xl"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </Stack>
          </form>

          <Text c="dimmed" size="sm" ta="center" mt={30}>
            ¿Ya tenés cuenta?{' '}
            <Anchor component={Link} href="/login" size="sm">
              Inicia sesión acá
            </Anchor>
          </Text>
        </Paper>
      </Center>
    </Container>
  );
}
