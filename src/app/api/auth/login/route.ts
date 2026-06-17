import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateJWT } from '@/lib/jwt';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Limita intentos de login por IP para mitigar fuerza bruta.
    const limit = rateLimit(`login:${getClientIp(request)}`, { limit: 5, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, msg: 'Demasiados intentos. Esperá un momento e intentá de nuevo.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, msg: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    // Mensaje genérico para no revelar si el email existe (evita enumeración de usuarios).
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json(
        { ok: false, msg: 'Email o contraseña incorrectos' },
        { status: 400 }
      );
    }

    // Generate JWT
    const token = await generateJWT(user._id.toString(), user.name);

    return NextResponse.json({
      ok: true,
      uid: user._id,
      name: user.name,
      email: user.email,
      token,
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
