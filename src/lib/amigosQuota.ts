/**
 * Reglas de negocio del campo "Motivo" y del cupo anual de reservas de Amigos.
 *
 * Este módulo es puro: no importa mongoose ni nada de Next. Toda la interacción
 * con la base se inyecta desde `amigosQuotaDb.ts`, para que la regla se pueda
 * testear (incluida la carrera concurrente) sin levantar una DB.
 */

export const MOTIVO_FAMILIAR = 'Familiar';
export const MOTIVO_AMIGOS = 'Amigos';

export const MOTIVOS = [MOTIVO_FAMILIAR, MOTIVO_AMIGOS] as const;

export type Motivo = (typeof MOTIVOS)[number];

/**
 * Cupo anual de Amigos para una persona que no tiene configuración propia.
 * `null` significa "sin límite"; `0` significa "no puede reservar Amigos".
 */
export const DEFAULT_LIMITE_AMIGOS_ANUAL = 1;

/**
 * Tipos de reserva que son marcas administrativas del calendario (feriados y
 * vacaciones) y no reservas de personas: no piden motivo ni consumen cupo.
 */
const BOOKINGS_SIN_MOTIVO = new Set(['FR', 'VC']);

/** Zona horaria de referencia para decidir a qué año calendario pertenece una reserva. */
export const RESERVA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Anticipación mínima para poder cancelar una reserva. Sin excepciones. */
export const CANCELACION_ANTICIPACION_MINIMA_HORAS = 24;

const MS_POR_HORA = 60 * 60 * 1000;

export function isMotivo(value: unknown): value is Motivo {
  return typeof value === 'string' && (MOTIVOS as readonly string[]).includes(value);
}

export function requiresMotivo(booking: unknown): boolean {
  return !BOOKINGS_SIN_MOTIVO.has(String(booking));
}

/** ¿Esta reserva consume cupo del límite anual de Amigos? */
export function consumesAmigosQuota(event: { booking?: unknown; motivo?: unknown }): boolean {
  return requiresMotivo(event.booking) && event.motivo === MOTIVO_AMIGOS;
}

/**
 * Normaliza el valor almacenado en la persona.
 * - `undefined` (persona sin configurar) -> límite por defecto.
 * - `null` -> sin límite.
 * - número -> ese límite.
 */
export function resolveLimiteAmigos(raw: number | null | undefined): number | null {
  if (raw === null) return null;
  if (raw === undefined) return DEFAULT_LIMITE_AMIGOS_ANUAL;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    return DEFAULT_LIMITE_AMIGOS_ANUAL;
  }
  return Math.floor(raw);
}

/**
 * Año calendario al que pertenece la reserva, calculado en la zona horaria de
 * la casa para que una reserva del 31/12 a la noche no caiga en el año siguiente
 * por la conversión a UTC del servidor.
 */
export function getReservaYear(start: Date | string | number): number {
  const date = start instanceof Date ? start : new Date(start);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Fecha de inicio inválida para calcular el año de la reserva');
  }
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: RESERVA_TIME_ZONE,
    year: 'numeric',
  }).format(date);
  return Number(year);
}

/** Menor entero positivo que no esté ocupado. */
export function nextFreeSlot(occupied: readonly number[]): number {
  const taken = new Set(occupied);
  let slot = 1;
  while (taken.has(slot)) slot += 1;
  return slot;
}

/** Horas que faltan para el inicio de la reserva. Negativo si ya empezó. */
export function horasHastaInicio(start: Date | string | number, now: Date = new Date()): number {
  const date = start instanceof Date ? start : new Date(start);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Fecha de inicio inválida');
  }
  return (date.getTime() - now.getTime()) / MS_POR_HORA;
}

/**
 * Una reserva solo puede cancelarse con al menos 24 horas de anticipación.
 * No hay excepción por urgencia, ni para reservas que ya empezaron o pasaron.
 */
export function puedeCancelarse(start: Date | string | number, now: Date = new Date()): boolean {
  return horasHastaInicio(start, now) >= CANCELACION_ANTICIPACION_MINIMA_HORAS;
}

export class MotivoRequeridoError extends Error {
  readonly code = 'MOTIVO_REQUERIDO';
  constructor(message = 'Tenés que elegir un motivo para la reserva: Familiar o Amigos.') {
    super(message);
    this.name = 'MotivoRequeridoError';
  }
}

export class AmigosQuotaExceededError extends Error {
  readonly code = 'AMIGOS_QUOTA_EXCEEDED';
  readonly limite: number;
  readonly usadas: number;
  readonly year: number;

  constructor(params: { limite: number; usadas: number; year: number }) {
    super(
      params.limite === 0
        ? `No tenés habilitadas reservas con motivo Amigos.`
        : `Ya usaste ${params.usadas} de ${params.limite} reserva${params.limite === 1 ? '' : 's'} con motivo Amigos para ${params.year}. Cancelá una reserva existente para liberar el cupo.`
    );
    this.name = 'AmigosQuotaExceededError';
    this.limite = params.limite;
    this.usadas = params.usadas;
    this.year = params.year;
  }
}

export class CancelacionFueraDePlazoError extends Error {
  readonly code = 'CANCELACION_FUERA_DE_PLAZO';
  readonly horasRestantes: number;

  constructor(horasRestantes: number) {
    super(
      horasRestantes < 0
        ? `Esta reserva ya empezó, no se puede cancelar. Las cancelaciones necesitan al menos ${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas de anticipación.`
        : `Faltan menos de ${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas para el inicio (${Math.floor(horasRestantes)} h): ya no se puede cancelar esta reserva.`
    );
    this.name = 'CancelacionFueraDePlazoError';
    this.horasRestantes = horasRestantes;
  }
}

export class AmigosSlotContentionError extends Error {
  readonly code = 'AMIGOS_SLOT_CONTENTION';
  constructor() {
    super('No se pudo confirmar la reserva por concurrencia. Intentá nuevamente.');
    this.name = 'AmigosSlotContentionError';
  }
}

/**
 * Valida el motivo recibido del cliente.
 * Devuelve `undefined` para reservas administrativas (feriado/vacaciones).
 */
export function parseMotivo(input: { booking?: unknown; motivo?: unknown }): Motivo | undefined {
  if (!requiresMotivo(input.booking)) return undefined;
  if (!isMotivo(input.motivo)) throw new MotivoRequeridoError();
  return input.motivo;
}

/**
 * Valida la ventana de cancelación.
 *
 * Los feriados y vacaciones que carga el admin (FR/VC) son marcas del
 * calendario, no reservas de una persona: no consumen cupo y quedan fuera de
 * la regla, igual que quedan fuera del motivo obligatorio.
 */
export function assertPuedeCancelar(params: {
  start: Date | string | number;
  booking?: unknown;
  now?: Date;
}): void {
  if (!requiresMotivo(params.booking)) return;

  const now = params.now ?? new Date();
  // Mismo criterio exacto que usa el frontend para habilitar el botón.
  if (!puedeCancelarse(params.start, now)) {
    throw new CancelacionFueraDePlazoError(horasHastaInicio(params.start, now));
  }
}

/** Uso del cupo anual de una persona en un año concreto. */
export interface AmigosUsage {
  /**
   * Total de reservas de Amigos vivas de ese año. Incluye las que no tienen
   * cupo asignado (reservas previas a esta implementación o cargadas por fuera
   * del flujo): también consumen límite.
   */
  usadas: number;
  /** Cupos numéricos ya tomados, para no pisar ninguno al asignar el próximo. */
  occupiedSlots: number[];
}

export interface AmigosSlotAttemptOptions<T> {
  /** Límite anual ya resuelto: número o `null` para ilimitado. */
  limite: number | null;
  /** Año calendario de la reserva. */
  year: number;
  /**
   * Uso actual del cupo de esa persona en ese año.
   * Se vuelve a leer en cada intento para que el reintento vea el estado real.
   */
  readUsage: () => Promise<AmigosUsage>;
  /** Persiste la reserva con el slot asignado. Debe fallar si el slot ya existe. */
  save: (slot: number) => Promise<T>;
  /** Identifica el error de clave duplicada del índice único de slots. */
  isSlotConflict: (error: unknown) => boolean;
  maxAttempts?: number;
}

/**
 * Reserva un cupo de Amigos y persiste, resistiendo condiciones de carrera.
 *
 * El chequeo de cupo por sí solo es vulnerable (dos requests leen "0 usadas" a
 * la vez). La garantía real la da el índice único sobre (user, año, slot): si
 * dos intentos eligen el mismo slot, uno falla y al reintentar recuenta, ya con
 * el cupo ocupado, y se rechaza.
 */
export async function saveWithAmigosSlot<T>(options: AmigosSlotAttemptOptions<T>): Promise<T> {
  const { limite, year, readUsage, save, isSlotConflict } = options;
  const maxAttempts = options.maxAttempts ?? 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { usadas, occupiedSlots } = await readUsage();

    if (limite !== null && usadas >= limite) {
      throw new AmigosQuotaExceededError({ limite, usadas, year });
    }

    try {
      return await save(nextFreeSlot(occupiedSlots));
    } catch (error) {
      if (!isSlotConflict(error)) throw error;
      // Otra request tomó ese slot entre el conteo y el insert: reintentamos.
    }
  }

  throw new AmigosSlotContentionError();
}
