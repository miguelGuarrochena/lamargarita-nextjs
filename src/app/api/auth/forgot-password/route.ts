import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail, buildResetPasswordEmail } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// Mensaje siempre genérico: no revela si el email existe (evita enumeración).
const GENERIC_MSG =
  'Si el email está registrado, te enviamos un enlace para restablecer la contraseña.';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const limit = rateLimit(`forgot:${getClientIp(request)}`, { limit: 5, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, msg: 'Demasiados intentos. Esperá un momento e intentá de nuevo.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, msg: 'El email es requerido' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    // Solo generamos token y mandamos mail si el usuario existe,
    // pero la respuesta es idéntica en ambos casos.
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await user.save();

      const baseUrl =
        process.env.NEXTAUTH_URL ||
        request.headers.get('origin') ||
        'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      const { subject, html, text } = buildResetPasswordEmail(user.name, resetUrl);

      try {
        await sendEmail({ to: user.email, subject, html, text });
      } catch (mailError) {
        // No exponemos el fallo al cliente, pero lo registramos.
        console.error('[forgot-password] error enviando email:', mailError);
      }
    }

    return NextResponse.json({ ok: true, msg: GENERIC_MSG });
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
