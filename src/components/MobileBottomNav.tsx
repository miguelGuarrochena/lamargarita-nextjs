'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Text, UnstyledButton } from '@mantine/core';
import { IconCalendar, IconChecklist, IconHome } from '@tabler/icons-react';
import { CalendarActionControls } from './CalendarActionControls';

const tabs = [
  { href: '/', label: 'Inicio', icon: IconHome, exact: true },
  { href: '/calendar', label: 'Calendario', icon: IconCalendar },
  { href: '/checklist', label: 'Checklist', icon: IconChecklist },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const onCalendar = pathname.startsWith('/calendar');

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const renderTab = ({ href, label, icon: Icon, exact }: (typeof tabs)[number]) => {
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
  };

  if (onCalendar) {
    return (
      <Box component="nav" className="lm-bottom-nav" hiddenFrom="sm">
        {renderTab(tabs[0])}
        {renderTab(tabs[1])}
        {renderTab(tabs[2])}
        <CalendarActionControls variant="bottom-nav" />
      </Box>
    );
  }

  return (
    <Box component="nav" className="lm-bottom-nav" hiddenFrom="sm">
      {tabs.map(renderTab)}
    </Box>
  );
};
