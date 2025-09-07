'use client';

import Link from 'next/link';
import { useAuthStore } from '@/hooks';
import { 
  AppShell, 
  Group, 
  Text, 
  Button, 
  Container,
  Anchor
} from '@mantine/core';
import { IconCalendar, IconLogout } from '@tabler/icons-react';

export const Navbar = () => {
  const { startLogout, user } = useAuthStore();

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <AppShell.Header p="md" style={{ backgroundColor: '#1a1b1e', borderBottom: '1px solid #373A40' }}>
        <Group justify="space-between" align="space-between" h="100%">
          <Anchor component={Link} href="/" underline="never">
            <Group align="center" gap="xs">
              <IconCalendar size={24} color="white" />
              <Text c="white" fw={600} size="lg">La Margarita</Text>
            </Group>
          </Anchor>

          <Group align="center" gap="md">
            <Text c="white" fw={500}>
              {user ? capitalizeFirst(user.name) : ''}
            </Text>
            
            <Button 
              variant="outline" 
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={startLogout}
            >
              Salir
            </Button>
          </Group>
        </Group>
    </AppShell.Header>
  );
};
