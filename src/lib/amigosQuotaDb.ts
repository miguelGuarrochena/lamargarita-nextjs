/**
 * Puente entre la regla de negocio pura (`amigosQuota.ts`) y Mongo.
 *
 * Centraliza el guardado de reservas para que POST y PUT compartan exactamente
 * la misma validación de tipoInvitado y de cupo anual de Amigos.
 */
import mongoose from 'mongoose';
import Event, { IEvent } from '@/lib/models/Event';
import User from '@/lib/models/User';
import {
  TIPO_AMIGOS,
  assertPuedeCancelar,
  getReservaYear,
  parseTipoInvitado,
  resolveLimiteAmigos,
  saveWithAmigosSlot,
  type AmigosUsage,
  type TipoInvitado,
} from '@/lib/amigosQuota';

/** Datos de reserva tal como llegan del cliente. */
export type ReservaInput = Record<string, unknown>;

/**
 * Lo mínimo que necesitamos saber de la reserva ya guardada para decidir si la
 * edición debe volver a pedir cupo. `IEvent` lo cumple estructuralmente.
 */
export interface ReservaExistente {
  tipoInvitado?: string;
  booking?: string;
  start: Date | string;
  amigosYear?: number;
  amigosSlot?: number;
  user: unknown;
}

/** Campos que el cliente nunca puede setear a mano: los controla el servidor. */
const CAMPOS_CONTROLADOS_POR_SERVIDOR = [
  'user',
  'tipoInvitado',
  // `motivo` es el nombre/motivo que puso el usuario ("MG", "Navidad", ...).
  // No lo escribimos nunca: se preserva tal cual está en la base.
  'motivo',
  'amigosYear',
  'amigosSlot',
  'id',
  '_id',
  '__v',
];

/**
 * Deja pasar solo lo que el cliente puede definir. `tipoInvitado` se valida aparte y
 * se reinyecta ya normalizado; `amigosYear`/`amigosSlot` los decide el servidor.
 */
function sanitizeEventInput(raw: ReservaInput): ReservaInput {
  const clean: ReservaInput = { ...raw };
  for (const field of CAMPOS_CONTROLADOS_POR_SERVIDOR) delete clean[field];
  return clean;
}

/** El índice único `amigos_slot_unico_por_anio` rechazó un slot ya tomado. */
function isSlotConflict(error: unknown): boolean {
  const err = error as { code?: number; message?: string } | null;
  return !!err && (err.code === 11000 || /E11000/.test(err.message ?? ''));
}

export async function getLimiteAmigos(userId: string): Promise<number | null> {
  const user = await User.findById(userId).select('limiteAmigosAnual').lean<{
    limiteAmigosAnual?: number | null;
  }>();
  return resolveLimiteAmigos(user?.limiteAmigosAnual);
}

/**
 * Uso del cupo de Amigos de una persona en un año.
 *
 * El cálculo es exactamente: reservas con `tipoInvitado: "Amigos"` cuyo `start`
 * cae en el año consultado. Nada más entra en la cuenta.
 *
 * Las reservas anteriores al sistema de cupos NO tienen `tipoInvitado`, así que
 * quedan naturalmente afuera: no cuentan y no se tocan. Es a propósito — no hay
 * forma confiable de saber si fueron con familia o con amigos, y deducirlo de
 * `motivo`/`title`/`notes`/`booking` sería inventar un dato. El contador
 * arranca en 0 sobre las reservas nuevas, sin ninguna lógica especial.
 *
 * Se cuentan tengan o no `amigosSlot`: el slot es solo la clave del índice
 * único, y una reserva de Amigos cargada por fuera del flujo no lo tiene.
 *
 * El año SIEMPRE se deriva del `start` de la reserva. `amigosYear` existe solo
 * como clave del índice único de cupos: si se lo usara para contar, sería una
 * segunda fuente de verdad que puede quedar desincronizada de la fecha real
 * (una reserva movida de fecha por fuera de este servicio, o editada directo en
 * la base) y esa reserva se volvería invisible para el cupo de su año.
 *
 * Como cancelar es borrar el documento, "viva" == "el documento existe": una
 * reserva cancelada libera el cupo automáticamente.
 */
async function readAmigosUsage(
  userId: string,
  year: number,
  excludeEventId?: string
): Promise<AmigosUsage> {
  const filter: Record<string, unknown> = {
    user: new mongoose.Types.ObjectId(userId),
    tipoInvitado: TIPO_AMIGOS,
  };
  if (excludeEventId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeEventId) };

  const docs = await Event.find(filter)
    .select('amigosSlot start')
    .lean<{ amigosSlot?: number; start: Date }[]>();

  const delAnio = docs.filter((d) => getReservaYear(d.start) === year);

  return {
    usadas: delAnio.length,
    occupiedSlots: delAnio
      .map((d) => d.amigosSlot)
      .filter((slot): slot is number => typeof slot === 'number'),
  };
}

export interface AmigosQuotaState {
  year: number;
  limite: number | null;
  usadas: number;
  restantes: number | null;
}

/** Estado del cupo para mostrarle a la persona en el formulario. */
export async function getAmigosQuotaState(
  userId: string,
  year: number = getReservaYear(new Date()),
  /** Reserva que se está editando: no debe contarse contra sí misma. */
  excludeEventId?: string
): Promise<AmigosQuotaState> {
  const [limite, usage] = await Promise.all([
    getLimiteAmigos(userId),
    readAmigosUsage(userId, year, excludeEventId),
  ]);
  const { usadas } = usage;
  return {
    year,
    limite,
    usadas,
    restantes: limite === null ? null : Math.max(0, limite - usadas),
  };
}

/** Crea una reserva aplicando tipoInvitado obligatorio + cupo anual de Amigos. */
export async function createReservation(
  userId: string,
  rawInput: ReservaInput
): Promise<IEvent> {
  const input = sanitizeEventInput(rawInput);
  const tipoInvitado = parseTipoInvitado({ booking: input.booking, tipoInvitado: rawInput.tipoInvitado });

  if (tipoInvitado !== TIPO_AMIGOS) {
    // Familiar (o marca administrativa): no toca el cupo.
    return await new Event({ ...input, tipoInvitado, user: userId }).save();
  }

  const year = getReservaYear(input.start as Date | string);
  const limite = await getLimiteAmigos(userId);

  return await saveWithAmigosSlot<IEvent>({
    limite,
    year,
    readUsage: () => readAmigosUsage(userId, year),
    isSlotConflict,
    save: (slot) =>
      new Event({
        ...input,
        tipoInvitado,
        user: userId,
        amigosYear: year,
        amigosSlot: slot,
      }).save(),
  });
}

/**
 * Editar una reserva de Amigos para que deje de consumir cupo (pasarla a
 * Familiar, o moverla a otro año) equivale a cancelarla: si no, sería la
 * puerta de atrás para esquivar la ventana de 24 horas. Editar cualquier otra
 * cosa de la reserva sigue siendo libre.
 */
function assertNoLiberaCupoFueraDePlazo(
  existing: ReservaExistente,
  nuevoMotivo: TipoInvitado | undefined,
  nuevoYear: number | null
): void {
  if (existing.tipoInvitado !== TIPO_AMIGOS) return;

  const yearActual = getReservaYear(existing.start);
  const liberaCupo = nuevoMotivo !== TIPO_AMIGOS || nuevoYear !== yearActual;
  if (!liberaCupo) return;

  assertPuedeCancelar({ start: existing.start, booking: existing.booking });
}

/**
 * Actualiza una reserva existente.
 *
 * Solo vuelve a pedir cupo cuando la reserva pasa a consumirlo o cambia de año
 * o de dueño; si sigue siendo Amigos del mismo año y persona, conserva su slot
 * para no consumir un cupo extra al editar.
 */
export async function updateReservation(
  userId: string,
  eventId: string,
  rawInput: ReservaInput,
  existing: ReservaExistente
): Promise<IEvent | null> {
  const input = sanitizeEventInput(rawInput);
  const tipoInvitado = parseTipoInvitado({ booking: input.booking, tipoInvitado: rawInput.tipoInvitado });

  if (tipoInvitado !== TIPO_AMIGOS) {
    // Familiar o marca administrativa: libera el cupo que pudiera tener, así
    // que pasa por la misma ventana de 24 h que una cancelación.
    assertNoLiberaCupoFueraDePlazo(existing, tipoInvitado, null);

    const update: Record<string, Record<string, unknown>> = {
      $set: { ...input, user: userId },
      $unset: { amigosYear: 1, amigosSlot: 1 },
    };
    if (tipoInvitado) {
      update.$set.tipoInvitado = tipoInvitado;
    } else {
      update.$unset.tipoInvitado = 1;
    }
    return await Event.findByIdAndUpdate(eventId, update, { new: true });
  }

  const year = getReservaYear(input.start as Date | string);
  assertNoLiberaCupoFueraDePlazo(existing, TIPO_AMIGOS, year);

  const mantieneSlot =
    existing.tipoInvitado === TIPO_AMIGOS &&
    existing.amigosYear === year &&
    typeof existing.amigosSlot === 'number' &&
    String(existing.user) === String(userId);

  if (mantieneSlot) {
    return await Event.findByIdAndUpdate(
      eventId,
      { $set: { ...input, tipoInvitado, user: userId, amigosYear: year, amigosSlot: existing.amigosSlot } },
      { new: true }
    );
  }

  const limite = await getLimiteAmigos(userId);

  return await saveWithAmigosSlot<IEvent | null>({
    limite,
    year,
    readUsage: () => readAmigosUsage(userId, year, eventId),
    isSlotConflict,
    save: (slot) =>
      Event.findByIdAndUpdate(
        eventId,
        { $set: { ...input, tipoInvitado, user: userId, amigosYear: year, amigosSlot: slot } },
        { new: true, runValidators: true }
      ),
  });
}

/**
 * Cancela (borra) una reserva, respetando la ventana mínima de anticipación.
 * Al borrarse, el cupo de Amigos del año queda libre de inmediato.
 */
export async function cancelReservation(
  eventId: string,
  existing: ReservaExistente,
  now: Date = new Date()
): Promise<void> {
  assertPuedeCancelar({ start: existing.start, booking: existing.booking, now });
  await Event.findByIdAndDelete(eventId);
}

export type { TipoInvitado };
