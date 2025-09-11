'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell, Loader, Center, Overlay, Text } from '@mantine/core';
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
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { BookingType, CalendarEvent } from '@/types';

export default function CalendarPage() {
  const { openDateModal } = useUiStore();
  const { events, setActiveEvent, startLoadingEvents, activeEvent } = useCalendarStore();
  const { status, checkAuthToken, user } = useAuthStore();
  const specialEvents = useSpecialEvents();
  const router = useRouter();

  const [lastView, setLastView] = useState<string>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isClient, setIsClient] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Merge regular events with special events
  const allEvents = useMemo(() => {
    return [...events, ...specialEvents];
  }, [events, specialEvents]);

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

  const eventStyleGetter = useCallback((event: CalendarEvent & { color?: string }) => {
    // If event has a color field (special events), use it
    if (event.color) {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '0 10px 10px 0',
          opacity: 0.8,
          display: 'block',
          color: event.booking === 'VC' ? '#fff' : '#000', // White text for vacations, black for holidays
          fontWeight: 'bold',
        },
      };
    }

    // Default styling for regular events
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



  const onSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {

      const today = new Date();
      today.setHours(0, 0, 0, 0); 
  
      const slotDate = new Date(slotInfo.start);
      slotDate.setHours(0, 0, 0, 0); 
  
      if (slotDate < today) return;
  
 
      if (activeEvent) {
        setActiveEvent(null);
        return;
      }
  
      // Fix date range bug: Ensure end date is inclusive for multi-day selections
      const adjustedEndDate = new Date(slotInfo.end);
      // If end date is different from start date (multi-day selection), subtract 1 day to make it inclusive
      if (slotInfo.end.getTime() !== slotInfo.start.getTime()) {
        adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
      }
      
      const newEvent: Partial<CalendarEvent> = {
        start: slotInfo.start,
        end: adjustedEndDate,
        title: '',
        booking: 'CT' as BookingType,
        notes: '',
      };
  
      setActiveEvent(newEvent as CalendarEvent);
      openDateModal();
    },
    [activeEvent, setActiveEvent, openDateModal]
  );
  

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    setActiveEvent(event);
  }, [setActiveEvent]);

  const onSelecting = useCallback((slotInfo: any) => {
    return true; 
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

  const loadEventsWithLoading = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      await startLoadingEvents();
    } finally {
      setIsLoadingEvents(false);
    }
  }, [startLoadingEvents]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadEventsWithLoading();
    }
  }, [status, loadEventsWithLoading]);

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
            events={allEvents}
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
        {isLoadingEvents && (
          <Overlay
            opacity={0.8}
            color="#fff"
            blur={3}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <Center>
              <div style={{ textAlign: 'center' }}>
                <Loader size="xl" />
              </div>
            </Center>
          </Overlay>
        )}
        <CalendarModal />
        <FabAddNew />
        <FabDelete />
      </AppShell.Main>
    </AppShell>
  );
}
