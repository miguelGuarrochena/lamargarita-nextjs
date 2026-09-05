/**
 * Ventana de reservas: hasta 3 meses de anticipación, móvil día a día.
 */
import { describe, expect, it } from 'vitest';
import {
  BOOKING_WINDOW_MONTHS,
  FueraDeVentanaDeReservaError,
  assertDentroDeVentana,
  assertEdicionDentroDeVentana,
  getMaxBookingDate,
  isAfterBookingWindow,
  isWithinBookingWindow,
} from '@/lib/bookingWindow';

const HOY = new Date(2026, 8, 5, 10, 0, 0);

describe('getMaxBookingDate', () => {
  it('la fecha máxima es hoy + 3 meses, tomada al final del día', () => {
    const max = getMaxBookingDate(HOY);

    expect(BOOKING_WINDOW_MONTHS).toBe(3);
    expect(max.getFullYear()).toBe(2026);
    expect(max.getMonth()).toBe(11); // diciembre
    expect(max.getDate()).toBe(5);
    expect(max.getHours()).toBe(23);
  });

  it('la ventana es móvil: un día después habilita un día más', () => {
    const manana = new Date(2026, 8, 6, 10, 0, 0);
    expect(getMaxBookingDate(manana).getDate()).toBe(6);
  });
});

describe('isWithinBookingWindow', () => {
  it('una fecha dentro de los 3 meses entra', () => {
    expect(isWithinBookingWindow(new Date(2026, 10, 20, 15, 0, 0), HOY)).toBe(true);
  });

  it('el último día completo entra, incluso de noche', () => {
    expect(isWithinBookingWindow(new Date(2026, 11, 5, 22, 0, 0), HOY)).toBe(true);
  });

  it('el día siguiente al tope ya queda afuera', () => {
    expect(isAfterBookingWindow(new Date(2026, 11, 6, 0, 0, 0), HOY)).toBe(true);
  });

  it('el pasado no lo decide esta regla: sigue estando "dentro" de la ventana', () => {
    expect(isWithinBookingWindow(new Date(2020, 0, 1, 0, 0, 0), HOY)).toBe(true);
  });
});

describe('assertDentroDeVentana — la ventana aplica solo a la entrada', () => {
  it('deja pasar una reserva dentro de la ventana', () => {
    expect(() =>
      assertDentroDeVentana({ start: new Date(2026, 10, 20, 15, 0, 0), now: HOY })
    ).not.toThrow();
  });

  it('la entrada del último día permitido entra', () => {
    expect(() =>
      assertDentroDeVentana({ start: new Date(2026, 11, 5, 15, 0, 0), now: HOY })
    ).not.toThrow();
  });

  it('rechaza cuando la entrada se pasa del tope', () => {
    expect(() =>
      assertDentroDeVentana({ start: new Date(2026, 11, 6, 15, 0, 0), now: HOY })
    ).toThrow(FueraDeVentanaDeReservaError);

    expect(() =>
      assertDentroDeVentana({ start: new Date(2027, 0, 10, 15, 0, 0), now: HOY })
    ).toThrow(FueraDeVentanaDeReservaError);
  });

  it('el mensaje dice hasta cuándo se puede reservar', () => {
    try {
      assertDentroDeVentana({ start: new Date(2027, 0, 10, 15, 0, 0), now: HOY });
      expect.unreachable('tendría que haber tirado');
    } catch (error) {
      expect(error).toBeInstanceOf(FueraDeVentanaDeReservaError);
      expect((error as FueraDeVentanaDeReservaError).code).toBe('FUERA_DE_VENTANA_RESERVA');
      expect((error as Error).message).toContain('3 meses');
      expect((error as Error).message).toContain('05/12/2026');
    }
  });
});

describe('assertEdicionDentroDeVentana', () => {
  const reservaGuardada = { start: new Date(2026, 10, 20, 15, 0, 0) };

  it('estirar solo la salida más allá del tope se permite', () => {
    expect(() =>
      assertEdicionDentroDeVentana({
        start: reservaGuardada.start, // la entrada no cambia
        actual: reservaGuardada,
        now: HOY,
      })
    ).not.toThrow();
  });

  it('mover la entrada más allá del tope se rechaza', () => {
    expect(() =>
      assertEdicionDentroDeVentana({
        start: new Date(2027, 0, 10, 15, 0, 0),
        actual: reservaGuardada,
        now: HOY,
      })
    ).toThrow(FueraDeVentanaDeReservaError);
  });

  it('mover la entrada dentro de la ventana se permite', () => {
    expect(() =>
      assertEdicionDentroDeVentana({
        start: new Date(2026, 11, 4, 15, 0, 0),
        actual: reservaGuardada,
        now: HOY,
      })
    ).not.toThrow();
  });

  it('una reserva vieja que ya quedó fuera de la ventana se puede seguir editando', () => {
    // La entrada guardada ya está fuera del tope, pero no se la está moviendo.
    const vieja = { start: new Date(2027, 5, 1, 15, 0, 0) };
    expect(() =>
      assertEdicionDentroDeVentana({ start: vieja.start, actual: vieja, now: HOY })
    ).not.toThrow();
  });
});
