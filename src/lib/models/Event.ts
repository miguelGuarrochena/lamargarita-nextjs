import mongoose, { Schema, Document } from 'mongoose';
import { BookingType } from '@/types';
import { MOTIVOS, type Motivo } from '@/lib/amigosQuota';

export interface IEvent extends Document {
  title: string;
  notes?: string;
  booking: BookingType;
  motivo?: Motivo;
  pax?: number;
  start: Date;
  end: Date;
  /** Año calendario al que imputa el cupo (solo reservas con motivo Amigos). */
  amigosYear?: number;
  /** Nº de cupo dentro del año. El índice único lo hace inviolable. */
  amigosSlot?: number;
  user: mongoose.Types.ObjectId;
}

const EventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  booking: {
    type: String,
    required: true,
  },
  motivo: {
    type: String,
    enum: MOTIVOS,
  },
  pax: {
    type: Number,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
  amigosYear: {
    type: Number,
  },
  amigosSlot: {
    type: Number,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
});

/**
 * Garantía de integridad del cupo anual de Amigos a nivel base de datos.
 *
 * Es un índice parcial: solo aplica a los documentos que tienen `amigosSlot`,
 * de modo que las reservas Familiar y las reservas históricas (previas a esta
 * funcionalidad) no lo tocan. Con esto, dos requests concurrentes no pueden
 * quedarse las dos con el mismo cupo aunque hagan el conteo al mismo tiempo.
 */
EventSchema.index(
  { user: 1, amigosYear: 1, amigosSlot: 1 },
  {
    unique: true,
    name: 'amigos_slot_unico_por_anio',
    partialFilterExpression: { amigosSlot: { $type: 'number' } },
  }
);

EventSchema.method('toJSON', function () {
  const { __v, _id, ...object } = this.toObject();
  object.id = _id;
  return object;
});

export default mongoose.models.Evento || mongoose.model<IEvent>('Evento', EventSchema, 'eventos');
