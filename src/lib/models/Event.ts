import mongoose, { Schema, Document } from 'mongoose';
import { BookingType } from '@/types';

export interface IEvent extends Document {
  title: string;
  notes?: string;
  booking: BookingType;
  pax?: number;
  start: Date;
  end: Date;
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
  user: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
});

EventSchema.method('toJSON', function () {
  const { __v, _id, ...object } = this.toObject();
  object.id = _id;
  return object;
});

export default mongoose.models.Evento || mongoose.model<IEvent>('Evento', EventSchema, 'eventos');
