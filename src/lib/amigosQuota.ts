/**
 * Reglas de negocio del campo "TipoInvitado" y del cupo anual de reservas de Amigos.
 *
 * Este módulo es puro: no importa mongoose ni nada de Next. Toda la interacción
 * con la base se inyecta desde `amigosQuotaDb.ts`, para que la regla se pueda
 * testear (incluida la carrera concurrente) sin levantar una DB.
 */

export const TIPO_FAMILIAR = 'Familiar';
export const TIPO_AMIGOS = 'Amigos';

export const TIPOS_INVITADO = [TIPO_FAMILIAR, TIPO_AMIGOS] as const;

export type TipoInvitado = (typeof TIPOS_INVITADO)[number];

/**
 * Cupo anual de Amigos para una persona que no tiene configuración propia.
 * `null` significa "sin límite"; `0` significa "no puede reservar Amigos".
 */
export const DEFAULT_LIMITE_AMIGOS_ANUAL = 1;

/**
 * Tipos de reserva que son marcas administrativas del calendario (feriados y
 * vacaciones) y no reservas de personas: no piden tipoInvitado ni consumen cupo.
 */
const BOOKINGS_SIN_TIPO_INVITADO = new Set(['FR', 'VC']);

/** Zona horaria de referencia para decidir a qué año calendario pertenece una reserva. */
export const RESERVA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Anticipación mínima para poder cancelar una reserva. Sin excepciones. */
export const CANCELACION_ANTICIPACION_MINIMA_HORAS = 24;

const MS_POR_HORA = 60 * 60 * 1000;

export function isTipoInvitado(value: unknown): value is TipoInvitado {
  return typeof value === 'string' && (TIPOS_INVITADO as readonly string[]).includes(value);
}

export function requiereTipoInvitado(booking: unknown): boolean {
  return !BOOKINGS_SIN_TIPO_INVITADO.has(String(booking));
}

/** ¿Esta reserva consume cupo del límite anual de Amigos? */
export function consumesAmigosQuota(event: { booking?: unknown; tipoInvitado?: unknown }): boolean {
  return requiereTipoInvitado(event.booking) && event.tipoInvitado === TIPO_AMIGOS;
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

export class TipoInvitadoRequeridoError extends Error {
  readonly code = 'TIPO_INVITADO_REQUERIDO';
  /** Qué llegó realmente en el payload. Para diagnóstico, no se muestra al usuario. */
  readonly recibido: unknown;

  constructor(recibido?: unknown, message = 'Tenés que elegir el tipo de invitado: Familiar o Amigos.') {
    super(message);
    this.name = 'TipoInvitadoRequeridoError';
    this.recibido = recibido;
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
        ? 'No tenés habilitadas las reservas de Amigos.'
        : // Redacción que no se rompe cuando `usadas` supera al límite, que es
          // lo que pasa con reservas anteriores a esta restricción.
          `Ya usaste tu cupo de reservas de Amigos para ${params.year} ` +
          `(${params.usadas} de ${params.limite}). Cancelá una reserva existente para liberar cupo.`
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
 * Valida el tipoInvitado recibido del cliente.
 * Devuelve `undefined` para reservas administrativas (feriado/vacaciones).
 */
export function parseTipoInvitado(input: { booking?: unknown; tipoInvitado?: unknown }): TipoInvitado | undefined {
  if (!requiereTipoInvitado(input.booking)) return undefined;
  if (!isTipoInvitado(input.tipoInvitado)) throw new TipoInvitadoRequeridoError(input.tipoInvitado);
  return input.tipoInvitado;
}

/**
 * Valida la ventana de cancelación.
 *
 * Los feriados y vacaciones que carga el admin (FR/VC) son marcas del
 * calendario, no reservas de una persona: no consumen cupo y quedan fuera de
 * la regla, igual que quedan fuera del tipoInvitado obligatorio.
 */
export function assertPuedeCancelar(params: {
  start: Date | string | number;
  booking?: unknown;
  now?: Date;
}): void {
  if (!requiereTipoInvitado(params.booking)) return;

  const now = params.now ?? new Date();
  // Mismo criterio exacto que usa el frontend para habilitar el botón.
  if (!puedeCancelarse(params.start, now)) {
    throw new CancelacionFueraDePlazoError(horasHastaInicio(params.start, now));
  }
}

/**
 * Aviso informativo del formulario cuando el tipo de invitado es Amigos.
 *
 * Es SOLO texto de UX: no valida, no bloquea y no participa del cupo ni de la
 * ventana de cancelación. La regla real sigue viviendo en `puedeCancelarse` /
 * `assertPuedeCancelar` (cancelación) y en `saveWithAmigosSlot` (cupo).
 */
export const AVISO_AMIGOS_CANCELABLE =
  `Recordá: podés cancelar esta reserva hasta ${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas antes. ` +
  'Si no la cancelás dentro de ese plazo, la reserva contará para tu cupo anual de Amigos.';

export const AVISO_AMIGOS_YA_CUENTA =
  'Esta reserva contará para tu cupo anual de Amigos, ya que faltan menos de ' +
  `${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas.`;

export function avisoCupoAmigos(params: {
  /** Valor elegido en el selector de tipo de invitado. Con Familiar no hay aviso. */
  tipoInvitado?: unknown;
  /**
   * `false` solo cuando el modal sabe con certeza que la ventana de cancelación
   * de esa reserva ya pasó (dato que ya usa para habilitar el botón de eliminar).
   * Ante la duda se deja el aviso general.
   */
  cancelacionEnPlazo?: boolean;
}): string | null {
  if (params.tipoInvitado !== TIPO_AMIGOS) return null;
  return params.cancelacionEnPlazo === false ? AVISO_AMIGOS_YA_CUENTA : AVISO_AMIGOS_CANCELABLE;
}

/**
 * ¿El formulario debe bloquear el guardado por falta de cupo?
 *
 * Única fuente de verdad para el aviso y para los dos botones (mobile y
 * desktop). Es solo UX: el backend valida igual.
 */
export function bloqueaPorCupoAmigos(params: {
  /** El tipoInvitado elegido es Amigos. Con Familiar nunca se bloquea. */
  esAmigos: boolean;
  quota: { limite: number | null; restantes: number | null } | null;
  /**
   * Se está editando una reserva que YA ocupa un cupo de ese mismo año: no
   * puede bloquearse a sí misma.
   */
  reservaEditadaConsumeCupo?: boolean;
}): boolean {
  const { esAmigos, quota, reservaEditadaConsumeCupo = false } = params;

  if (!esAmigos) return false;
  if (!quota) return false; // sin datos del cupo no bloqueamos
  if (quota.limite === null) return false; // ilimitado
  if (reservaEditadaConsumeCupo) return false;

  return quota.restantes === 0;
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
