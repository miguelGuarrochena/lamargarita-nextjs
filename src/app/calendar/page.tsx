'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell, Loader, Center } from '@mantine/core';
import { Calendar as BigCalendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { localizer, getMessagesES } from '@/lib/helpers';

import { 
  Navbar,
  CalendarEvent as CalendarEventComponent,
  CalendarModal,
  FabAddNew,
  FabDelete,
} from '@/components';
import { useUiStore, useCalendarStore, useAuthStore } from '@/hooks';
import { CalendarEvent } from '@/types';

export default function CalendarPage() {
  const { openDateModal } = useUiStore();
  const { events, setActiveEvent, startLoadingEvents, activeEvent } = useCalendarStore();
  const { status, checkAuthToken, user } = useAuthStore();
  const router = useRouter();

  const [lastView, setLastView] = useState<string>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    checkAuthToken();
  }, [checkAuthToken]); // Add checkAuthToken dependency

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const savedView = localStorage.getItem('lastView');
      if (savedView) {
        setLastView(savedView);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (status === 'not-authenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const style = {
      backgroundColor:
        'CT' === event.booking
          ? '#E74C3C'
          : 'PA' === event.booking
          ? '#edc308'
          : 'PR' === event.booking
          ? '#086ded'
          : 'CS' === event.booking
          ? '#808000'
          : 'NC' === event.booking
          ? '#d8ed08'
          : 'FL' === event.booking
          ? '#5DADE2'
          : 'FR' === event.booking
          ? '#DCDCDC'
          : '#F8DBC4',

      borderRadius: '0 10px 10px 0',
      opacity: 0.8,
      display: 'block',
      color: 'NC' === event.booking ? '#000' : '#fff',
    };

    return {
      style,
    };
  }, []);

  const onDoubleClick = useCallback((event: CalendarEvent) => {
    // Validate ownership before opening modal - same logic as hasEventSelected
    if (!user || !event.user || event.user._id !== user.uid) {
      // Event doesn't belong to current user, don't open modal
      return;
    }
    
    // Set the active event before opening modal
    setActiveEvent(event);
    openDateModal();
  }, [user, setActiveEvent, openDateModal]);

  const onSelectSlot = useCallback((event: { start: Date; end: Date }) => {
    setActiveEvent(null);
  }, [setActiveEvent]);

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    setActiveEvent(event);
  }, [setActiveEvent]);

  const onSelecting = useCallback((slotInfo: any) => {
    // Only clear selection when clicking truly empty calendar space
    // Don't interfere with event selection process
    return true; // Allow default selection behavior
  }, []);

  const onViewChanged = useCallback((event: string) => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('lastView', event);
    }
    setLastView(event);
  }, [isClient]);

  const onNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    // Clear active event when navigating to prevent stale selections
    setActiveEvent(null);
  }, [setActiveEvent]);

  useEffect(() => {
    if (status === 'authenticated') {
      startLoadingEvents();
    }
  }, [status, startLoadingEvents]);

  if (status === 'checking') {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (status === 'not-authenticated') {
    return null;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <Navbar />

      <AppShell.Main>
        {isClient && (
          <BigCalendar
            culture="es"
            localizer={localizer}
            events={events}
            view={lastView as any}
            date={currentDate}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc( 100vh - 80px )' }}
            step={60}
            showMultiDayTimes={false}
            messages={getMessagesES()}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CalendarEventComponent,
            }}
            selectable
            selected={activeEvent}
            onDoubleClickEvent={onDoubleClick}
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            onSelecting={onSelecting}
            onView={onViewChanged}
            onNavigate={onNavigate}
          />
        )}

        <CalendarModal />
        <FabAddNew />
        <FabDelete />
      </AppShell.Main>
    </AppShell>
  );
}
