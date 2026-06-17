import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, msg: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // El token viaja en claro en el enlace; en la base guardamos su hash.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, msg: 'El enlace es inválido o expiró. Pedí uno nuevo.' },
        { status: 400 }
      );
    }

    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Logueamos al usuario directamente tras el reset.
    const newToken = await generateJWT(user._id.toString(), user.name);

    return NextResponse.json({
      ok: true,
      uid: user._id,
      name: user.name,
      email: user.email,
      token: newToken,
    });
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
