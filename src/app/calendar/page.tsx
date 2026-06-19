'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell, Loader, Center, Box, Overlay } from '@mantine/core';

import { Navbar } from '@/components/Navbar';
import { useUiStore, useCalendarStore, useAuthStore } from '@/hooks';
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { isOwnEvent } from '@/lib/eventOwnership';
import { BookingType, CalendarEvent } from '@/types';
import type { CalendarViewProps } from '@/components/CalendarView';

const CalendarView = dynamic(() => import('@/components/CalendarView'), {
  ssr: false,
});

const CalendarModal = dynamic(
  () => import('@/components/CalendarModal').then((mod) => ({ default: mod.CalendarModal })),
  { ssr: false }
);

const HEADER_HEIGHT = 56;

export default function CalendarPage() {
  const { openDateModal } = useUiStore();
  const { events, setActiveEvent, startLoadingEvents, activeEvent, isLoadingEvents } =
    useCalendarStore();
  const { status, checkAuthToken, user } = useAuthStore();
  const specialEvents = useSpecialEvents();
  const router = useRouter();
  const hadCachedEvents = useRef(events.length > 0);

  const [lastView, setLastView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarReady, setCalendarReady] = useState(false);

  const allEvents = useMemo(
    () => [...events, ...specialEvents],
    [events, specialEvents]
  );

  useEffect(() => {
    import('@/components/CalendarView').then(() => setCalendarReady(true));
  }, []);

  useEffect(() => {
    checkAuthToken();
  }, [checkAuthToken]);

  useEffect(() => {
    const savedView = localStorage.getItem('lastView');
    if (savedView) setLastView(savedView);
  }, []);

  useEffect(() => {
    if (status === 'not-authenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    startLoadingEvents({ silent: hadCachedEvents.current });
  }, [status, startLoadingEvents]);

  const eventStyleGetter = useCallback((event: CalendarEvent & { color?: string }) => {
    if (event.color) {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '6px',
          opacity: 0.88,
          display: 'block',
          color: event.booking === 'VC' ? '#fff' : '#000',
          fontWeight: 600,
        },
      };
    }

    return {
      style: {
        backgroundColor:
          event.booking === 'CT' ? '#E74C3C'
          : event.booking === 'PA' ? '#edc308'
          : event.booking === 'PR' ? '#086ded'
          : event.booking === 'CS' ? '#808000'
          : event.booking === 'NC' ? '#d8ed08'
          : event.booking === 'FL' ? '#5DADE2'
          : event.booking === 'FR' ? '#DCDCDC'
          : '#F8DBC4',
        borderRadius: '6px',
        opacity: 0.88,
        display: 'block',
        color: event.booking === 'NC' ? '#000' : '#fff',
      },
    };
  }, []);

  const onSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (!isOwnEvent(event, user)) {
        setActiveEvent(null);
        return;
      }

      setActiveEvent(event);
      openDateModal();
    },
    [user, setActiveEvent, openDateModal]
  );
  const onSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = new Date(slotInfo.start);
      slotDate.setHours(0, 0, 0, 0);

      if (slotDate < today) {
        setActiveEvent(null);
        return;
      }

      const adjustedEndDate = new Date(slotInfo.end);
      if (slotInfo.end.getTime() !== slotInfo.start.getTime()) {
        adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
      }

      setActiveEvent({
        start: slotInfo.start,
        end: adjustedEndDate,
        title: '',
        booking: 'CT' as BookingType,
        notes: '',
      } as CalendarEvent);
      openDateModal();
    },
    [setActiveEvent, openDateModal]
  );

  const handleCalendarClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.rbc-event, .rbc-toolbar, button, a')) return;
      if (target.closest('.rbc-day-bg, .rbc-date-cell')) return;
      if (target.closest('.rbc-calendar')) {
        setActiveEvent(null);
      }
    },
    [setActiveEvent]
  );

  const onViewChanged = useCallback((view: string) => {
    localStorage.setItem('lastView', view);
    setLastView(view);
  }, []);

  const onNavigate = useCallback(
    (newDate: Date) => {
      setCurrentDate(newDate);
      setActiveEvent(null);
    },
    [setActiveEvent]
  );

  const showBlockingLoader =
    !calendarReady || (isLoadingEvents && events.length === 0);

  if (status === 'checking') {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (status === 'not-authenticated') return null;

  const calendarProps: CalendarViewProps = {
    events: allEvents,
    view: lastView,
    date: currentDate,
    selected: activeEvent,
    onDoubleClickEvent: onSelectEvent,
    onSelectSlot,
    onSelectEvent,
    onView: onViewChanged,
    onNavigate,
    eventPropGetter: eventStyleGetter,
  };

  return (
    <>
    <AppShell header={{ height: HEADER_HEIGHT }} padding={0} className="lm-calendar-shell">
      <Navbar />

      <AppShell.Main
        className="lm-shell-main"
        style={{
          height: `calc(100vh - ${HEADER_HEIGHT}px - var(--lm-bottom-nav-h))`,
          overflow: 'hidden',
        }}
      >
        <Box
          h="100%"
          px={{ base: 6, sm: 10 }}
          py={6}
          className="lm-calendar-wrap"
          onClick={handleCalendarClick}
        >
          <CalendarView {...calendarProps} />
        </Box>

        {showBlockingLoader && (
          <Overlay
            opacity={0.5}
            color="#fff"
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          >
            <Center h="100%">
              <Loader size="lg" />
            </Center>
          </Overlay>
        )}
      </AppShell.Main>
    </AppShell>

    <CalendarModal />
    </>
  );
}
