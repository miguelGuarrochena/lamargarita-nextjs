/**
 * Ventana de reservas: hasta cuándo hacia adelante se puede reservar.
 *
 * Este módulo es puro (no importa mongoose ni nada de Next), como
 * `amigosQuota.ts`: lo usan el calendario, el formulario y el backend, para que
 * la regla viva en un solo lugar y el `3` no quede repetido.
 *
 * La ventana es MÓVIL: se recalcula sobre "ahora" en cada llamada, así cada día
 * que pasa habilita automáticamente un día nuevo al final.
 */
import { addMonths } from 'date-fns';

/** Meses de anticipación máxima con los que se puede reservar. */
export const BOOKING_WINDOW_MONTHS = 3;

/** Texto informativo que se muestra junto al calendario. */
export const AVISO_VENTANA_RESERVAS =
  `Reservas disponibles hasta ${BOOKING_WINDOW_MONTHS} meses de anticipación.`;

/**
 * Última fecha reservable, tomada al final del día para que ese día entero
 * quede adentro sin importar la hora que traiga la reserva.
 */
export function getMaxBookingDate(now: Date = new Date()): Date {
  const max = addMonths(now, BOOKING_WINDOW_MONTHS);
  max.setHours(23, 59, 59, 999);
  return max;
}

/** ¿Esta fecha cae después del último día reservable? */
export function isAfterBookingWindow(
  date: Date | string | number,
  now: Date = new Date()
): boolean {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return false; // fecha inválida: la valida quien corresponde
  return value.getTime() > getMaxBookingDate(now).getTime();
}

/** ¿Esta fecha está dentro de la ventana? No mira el pasado: eso es otra regla. */
export function isWithinBookingWindow(
  date: Date | string | number,
  now: Date = new Date()
): boolean {
  return !isAfterBookingWindow(date, now);
}

const formatFecha = (date: Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

export class FueraDeVentanaDeReservaError extends Error {
  readonly code = 'FUERA_DE_VENTANA_RESERVA';
  readonly maxDate: Date;

  constructor(maxDate: Date) {
    super(
      `Solo se puede reservar hasta ${BOOKING_WINDOW_MONTHS} meses de anticipación ` +
        `(hasta el ${formatFecha(maxDate)}).`
    );
    this.name = 'FueraDeVentanaDeReservaError';
    this.maxDate = maxDate;
  }
}

/**
 * Valida la fecha de ENTRADA de la reserva contra la ventana.
 *
 * La salida queda deliberadamente afuera de esta regla: lo que se limita es con
 * cuánta anticipación se puede iniciar una reserva, no cuánto puede durar. Una
 * estadía que empieza dentro de la ventana puede terminar después del tope.
 */
export function assertDentroDeVentana(params: {
  start: Date | string | number;
  now?: Date;
}): void {
  const now = params.now ?? new Date();
  if (isAfterBookingWindow(params.start, now)) {
    throw new FueraDeVentanaDeReservaError(getMaxBookingDate(now));
  }
}

/** ¿La fecha que llega es distinta de la que ya estaba guardada? */
function fechaCambio(nueva: unknown, actual: Date | string | undefined): boolean {
  if (nueva === undefined || nueva === null || actual === undefined || actual === null) return false;
  const a = new Date(nueva as string | Date).getTime();
  const b = new Date(actual).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a !== b;
}

/**
 * Misma regla, aplicada a una edición: la ventana se exige solo cuando cambia
 * la fecha de ENTRADA.
 *
 * Así una reserva vieja que hoy ya quedaría fuera de la ventana se puede seguir
 * editando (título, notas, cantidad de gente), y también se le puede estirar la
 * salida más allá del tope; lo que no se puede es mover la entrada más allá del
 * tope, que sería la puerta de atrás para saltear la regla.
 */
export function assertEdicionDentroDeVentana(params: {
  start: Date | string | number;
  actual: { start: Date | string };
  now?: Date;
}): void {
  const { start, actual, now } = params;

  if (fechaCambio(start, actual.start)) assertDentroDeVentana({ start, now });
}
