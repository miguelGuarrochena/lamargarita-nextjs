// @vitest-environment jsdom
/**
 * Ventana de reservas en el calendario: los días posteriores al tope se ven
 * deshabilitados y no se puede navegar más allá del último mes permitido.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import CalendarView, { type CalendarViewProps } from '@/components/CalendarView';
import { getMaxBookingDate } from '@/lib/bookingWindow';

const HOY = new Date(2026, 8, 5); // 5 de septiembre de 2026
const MAX = getMaxBookingDate(HOY); // 5 de diciembre de 2026, fin del día

const noop = () => {};

const renderCalendario = (date: Date) => {
  const props: CalendarViewProps = {
    events: [],
    view: 'month',
    date,
    selected: null,
    maxBookingDate: MAX,
    onDoubleClickEvent: noop,
    onSelectSlot: noop,
    onSelectEvent: noop,
    onDrillDown: noop,
    onView: noop,
    onNavigate: noop,
    eventPropGetter: () => ({ style: {} }),
    dayPropGetter: (d: Date) => (d > MAX ? { className: 'lm-day-fuera-de-ventana' } : {}),
  };
  return render(<CalendarView {...props} />);
};

const botonSiguiente = () =>
  screen.getByRole('button', { name: '>' }) as HTMLButtonElement;

afterEach(cleanup);

describe('CalendarView — ventana de reservas', () => {
  it('en un mes intermedio se puede seguir avanzando', () => {
    renderCalendario(new Date(2026, 10, 15)); // noviembre
    expect(botonSiguiente().disabled).toBe(false);
  });

  it('en el último mes permitido el botón de avanzar queda deshabilitado', () => {
    renderCalendario(new Date(2026, 11, 15)); // diciembre: contiene el tope
    expect(botonSiguiente().disabled).toBe(true);
  });

  it('los botones de hoy y anterior siguen habilitados en el último mes', () => {
    renderCalendario(new Date(2026, 11, 15));
    expect((screen.getByRole('button', { name: 'Hoy' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: '<' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('los días posteriores al tope se marcan como deshabilitados y los anteriores no', () => {
    const { container } = renderCalendario(new Date(2026, 11, 15));

    const fueraDeVentana = container.querySelectorAll('.rbc-day-bg.lm-day-fuera-de-ventana');
    const dentroDeVentana = container.querySelectorAll(
      '.rbc-day-bg:not(.lm-day-fuera-de-ventana)'
    );

    // La grilla de diciembre 2026 arranca el lunes 30/11 y el tope es el 5/12:
    // quedan adentro 30/11 y 1..5/12, o sea 6 días. Todo el resto, afuera.
    expect(dentroDeVentana).toHaveLength(6);
    expect(fueraDeVentana.length).toBe(
      container.querySelectorAll('.rbc-day-bg').length - 6
    );
    expect(fueraDeVentana.length).toBeGreaterThan(0);
  });
});
