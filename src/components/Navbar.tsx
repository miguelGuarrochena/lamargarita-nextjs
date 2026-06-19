'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks';
import {
  AppShell,
  Group,
  Text,
  Button,
  Anchor,
  Avatar,
  ActionIcon,
} from '@mantine/core';
import { IconLogout, IconCalendar, IconChecklist, IconHome } from '@tabler/icons-react';
import { BrandLockup } from './BrandLockup';
import { MobileBottomNav } from './MobileBottomNav';

const navLinks = [
  { href: '/', label: 'Inicio', icon: IconHome, exact: true },
  { href: '/calendar', label: 'Calendario', icon: IconCalendar },
  { href: '/checklist', label: 'Checklist', icon: IconChecklist },
];

export const Navbar = () => {
  const { startLogout, user } = useAuthStore();
  const pathname = usePathname();

  const capitalizeFirst = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const displayName = user ? capitalizeFirst(user.name) : '';

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <AppShell.Header px="md" className="lm-navbar">
        <Group justify="space-between" align="center" h="100%">
          <Anchor component={Link} href="/" underline="never">
            <BrandLockup logoSize={32} />
          </Anchor>

          <Group align="center" gap={4}>
            {navLinks.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Button
                  key={href}
                  component={Link}
                  href={href}
                  variant={active ? 'light' : 'subtle'}
                  color={active ? 'brand' : 'gray'}
                  size="compact-sm"
                  leftSection={<Icon size={15} />}
                  visibleFrom="sm"
                >
                  {label}
                </Button>
              );
            })}

            {displayName && (
              <Group gap="xs" ml={4} visibleFrom="md">
                <Avatar size={28} radius="xl" color="brand" variant="light">
                  {displayName.charAt(0)}
                </Avatar>
                <Text fw={500} size="sm" c="dark.6">
                  {displayName}
                </Text>
              </Group>
            )}

            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconLogout size={15} />}
              onClick={startLogout}
              ml={4}
              visibleFrom="sm"
            >
              Salir
            </Button>

            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={startLogout}
              aria-label="Salir"
              hiddenFrom="sm"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <MobileBottomNav />
    </>
  );
};
