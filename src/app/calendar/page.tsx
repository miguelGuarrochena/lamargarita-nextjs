'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell, Loader, Center, Box, Overlay, Text } from '@mantine/core';

import { Navbar } from '@/components/Navbar';
import { useUiStore, useCalendarStore, useAuthStore } from '@/hooks';
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { canManageEvent } from '@/lib/eventOwnership';
import { AVISO_VENTANA_RESERVAS, getMaxBookingDate } from '@/lib/bookingWindow';
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

  // Última fecha reservable. Se calcula al montar: la ventana es móvil, pero
  // para que corra un día basta con que la persona vuelva a entrar al calendario.
  const maxBookingDate = useMemo(() => getMaxBookingDate(), []);

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

  // Los días posteriores a la ventana se ven deshabilitados. No hay aviso ni
  // popup: simplemente no se pueden elegir.
  const dayStyleGetter = useCallback(
    (date: Date) => (date > maxBookingDate ? { className: 'lm-day-fuera-de-ventana' } : {}),
    [maxBookingDate]
  );

  const createReservationForDate = useCallback(
    (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);

      // No se puede reservar en el pasado ni más allá de la ventana de reservas.
      // Sin aviso: la fecha ya se ve deshabilitada en el calendario.
      if (target < today || target > maxBookingDate) {
        setActiveEvent(null);
        return;
      }

      setActiveEvent({
        start: new Date(date),
        end: new Date(date),
        title: '',
        booking: 'CT' as BookingType,
        notes: '',
      } as CalendarEvent);
      openDateModal();
    },
    [setActiveEvent, openDateModal, maxBookingDate]
  );

  const openEventEditor = useCallback(
    (event: CalendarEvent) => {
      // Si la reserva es de otro usuario (o es un feriado/vacaciones),
      // dejamos crear una reserva nueva en esa fecha.
      if (!canManageEvent(event, user)) {
        createReservationForDate(new Date(event.start));
        return;
      }

      setActiveEvent(event);
      openDateModal();
    },
    [user, createReservationForDate, setActiveEvent, openDateModal]
  );

  const onSelectEvent = openEventEditor;

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

      // Fuera de la ventana de reservas no se abre el modal, y sin popup. Solo
      // se mira la entrada: la salida puede caer después del tope.
      if (slotDate > maxBookingDate) {
        setActiveEvent(null);
        return;
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
    [setActiveEvent, openDateModal, maxBookingDate]
  );

  const onDrillDown = useCallback(
    (date: Date) => createReservationForDate(date),
    [createReservationForDate]
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
      // El botón de "siguiente" ya se deshabilita en el último período
      // reservable; esto cubre cualquier otra vía de navegación.
      const periodoInicio = new Date(newDate);
      periodoInicio.setHours(0, 0, 0, 0);
      if (periodoInicio > maxBookingDate) return;

      setCurrentDate(newDate);
      setActiveEvent(null);
    },
    [setActiveEvent, maxBookingDate]
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
    onDoubleClickEvent: openEventEditor,
    onSelectSlot,
    onSelectEvent,
    onDrillDown,
    onView: onViewChanged,
    onNavigate,
    eventPropGetter: eventStyleGetter,
    dayPropGetter: dayStyleGetter,
    maxBookingDate,
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
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <Box style={{ flex: 1, minHeight: 0 }}>
            <CalendarView {...calendarProps} />
          </Box>
          <Text size="xs" c="dimmed" ta="center" mt={6}>
            {AVISO_VENTANA_RESERVAS}
          </Text>
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
