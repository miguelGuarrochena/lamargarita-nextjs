import mongoose, { Schema, Document } from 'mongoose';
import { DEFAULT_LIMITE_AMIGOS_ANUAL } from '@/lib/amigosQuota';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  /**
   * Cupo anual de reservas con motivo "Amigos" para esta persona.
   * Número >= 0 -> ese máximo por año calendario (0 = no puede reservar Amigos).
   * `null` -> sin límite.
   * Ausente -> se aplica DEFAULT_LIMITE_AMIGOS_ANUAL.
   */
  limiteAmigosAnual?: number | null;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  limiteAmigosAnual: {
    type: Number,
    default: DEFAULT_LIMITE_AMIGOS_ANUAL,
    min: 0,
  },
});

UserSchema.method('toJSON', function () {
  const { __v, _id, password, ...object } = this.toObject();
  object.id = _id;
  return object;
});

export default mongoose.models.Usuario || mongoose.model<IUser>('Usuario', UserSchema, 'usuarios');
