import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
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
});

UserSchema.method('toJSON', function () {
  const { __v, _id, password, ...object } = this.toObject();
  object.id = _id;
  return object;
});

export default mongoose.models.Usuario || mongoose.model<IUser>('Usuario', UserSchema, 'usuarios');
