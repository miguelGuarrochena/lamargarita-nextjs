import { CalendarEvent, BookingType } from '@/types';

// Admin user ObjectId for system events
const ADMIN_USER_ID = '507f1f77bcf86cd799439011';

// Argentina Holidays 2026
export const argentineHolidays2026: CalendarEvent[] = [
  {
    id: 'holiday-2026-01-01',
    title: 'Año Nuevo',
    booking: 'FR' as BookingType,
    start: new Date(2026, 0, 1), // January 1
    end: new Date(2026, 0, 1),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-02-16-17',
    title: 'Carnaval',
    booking: 'FR' as BookingType,
    start: new Date(2026, 1, 16), // February 16
    end: new Date(2026, 1, 18), // February 17
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-03-24',
    title: 'Día Nacional de la Memoria por la Verdad y la Justicia',
    booking: 'FR' as BookingType,
    start: new Date(2026, 2, 24), // March 24
    end: new Date(2026, 2, 24),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-04-02',
    title: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
    booking: 'FR' as BookingType,
    start: new Date(2026, 3, 2), // April 2
    end: new Date(2026, 3, 2),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-04-03',
    title: 'Viernes Santo',
    booking: 'FR' as BookingType,
    start: new Date(2026, 3, 3), // April 3
    end: new Date(2026, 3, 3),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-05-01',
    title: 'Día del Trabajador',
    booking: 'FR' as BookingType,
    start: new Date(2026, 4, 1), // May 1
    end: new Date(2026, 4, 1),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-05-25',
    title: 'Día de la Revolución de Mayo',
    booking: 'FR' as BookingType,
    start: new Date(2026, 4, 25), // May 25
    end: new Date(2026, 4, 25),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-06-15',
    title: 'Paso a la inm. Gral. Güemes',
    booking: 'FR' as BookingType,
    start: new Date(2026, 5, 17), // June 17
    end: new Date(2026, 5, 17),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-06-15',
    title: 'Paso a la inm. del Gral. Belgrano',
    booking: 'FR' as BookingType,
    start: new Date(2026, 5, 20), // June 20
    end: new Date(2026, 5, 20),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-07-09',
    title: 'Día de la Independencia',
    booking: 'FR' as BookingType,
    start: new Date(2026, 6, 9), // July 9
    end: new Date(2026, 6, 9),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-08-17',
    title: 'Paso a la inm. del Gral San Martín',
    booking: 'FR' as BookingType,
    start: new Date(2026, 7, 17), // August 17
    end: new Date(2026, 7, 17),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-10-12',
    title: 'Día de la raza',
    booking: 'FR' as BookingType,
    start: new Date(2026, 9, 12), // October 12
    end: new Date(2026, 9, 12),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-11-23',
    title: 'Día de la Soberanía Nacional',
    booking: 'FR' as BookingType,
    start: new Date(2026, 10, 20), // November 20
    end: new Date(2026, 10, 20),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-12-08',
    title: 'Inmaculada Concepción de María',
    booking: 'FR' as BookingType,
    start: new Date(2026, 11, 8), // December 8
    end: new Date(2026, 11, 8),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  },
  {
    id: 'holiday-2026-12-25',
    title: 'Navidad',
    booking: 'FR' as BookingType,
    start: new Date(2026, 11, 25), // December 25
    end: new Date(2026, 11, 25),
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  }
];

// Summer vacation: December 20, 2025 → March 8, 2026 (single event with date range)
export const summerVacation: CalendarEvent[] = [
  {
    id: 'summer-vacation-2025-2026',
    title: 'Vacaciones de Verano',
    booking: 'VC' as BookingType,
    start: new Date(2025, 11, 20), // December 20, 2025
    end: new Date(2026, 2, 8),     // March 8, 2026
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  }
];

// Winter vacation: July 14 → July 30, 2026 (single event with date range)
export const winterVacation: CalendarEvent[] = [
  {
    id: 'winter-vacation-2026',
    title: 'Vacaciones de Invierno',
    booking: 'VC' as BookingType,
    start: new Date(2026, 6, 14), // July 14, 2026
    end: new Date(2026, 6, 30),   // July 30, 2026
    pax: 1,
    user: { _id: ADMIN_USER_ID, name: 'ADMIN' }
  }
];

// Combined special events export
export const specialEvents2026: CalendarEvent[] = [
  ...argentineHolidays2026,
  ...summerVacation,
  ...winterVacation
];

// Summary object for reference
export const SPECIAL_DATES_SUMMARY = {
  holidays: argentineHolidays2026.length,
  summerVacationEvents: summerVacation.length,
  winterVacationEvents: winterVacation.length,
  totalEvents: specialEvents2026.length,
  dateRanges: {
    summerVacation: {
      start: '2025-12-20',
      end: '2026-03-08',
      days: 79
    },
    winterVacation: {
      start: '2026-07-14',
      end: '2026-07-30',
      days: 17
    }
  }
};
