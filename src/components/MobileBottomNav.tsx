'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconCalendar, IconChecklist, IconHome } from '@tabler/icons-react';

const tabs = [
  { href: '/', label: 'Inicio', icon: IconHome, exact: true },
  { href: '/calendar', label: 'Calendario', icon: IconCalendar },
  { href: '/checklist', label: 'Checklist', icon: IconChecklist },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <Box component="nav" className="lm-bottom-nav" hiddenFrom="sm">
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <UnstyledButton
            key={href}
            component={Link}
            href={href}
            className={`lm-bottom-nav__item${active ? ' lm-bottom-nav__item--active' : ''}`}
          >
            <Icon size={22} stroke={active ? 2.2 : 1.6} />
            <Text size="10px" fw={active ? 700 : 500} mt={2}>
              {label}
            </Text>
          </UnstyledButton>
        );
      })}
    </Box>
  );
};
