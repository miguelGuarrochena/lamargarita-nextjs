import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { validateJWT } from '@/lib/middleware';
import { sendEmail } from '@/lib/email';

interface PendingSection {
  title: string;
  items: string[];
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const decoded = await validateJWT(request);
    const { pending } = (await request.json()) as { pending: PendingSection[] };

    if (!Array.isArray(pending) || pending.length === 0) {
      return NextResponse.json(
        { ok: false, msg: 'No hay ítems pendientes para enviar' },
        { status: 400 }
      );
    }

    const user = await User.findById(decoded.uid);
    if (!user) {
      return NextResponse.json(
        { ok: false, msg: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const totalPending = pending.reduce((acc, s) => acc + s.items.length, 0);

    const sectionsHtml = pending
      .map(
        (s) => `
        <h3 style="color:#ed6a2a;margin:18px 0 6px;font-size:15px;">${s.title}</h3>
        <ul style="margin:0;padding-left:20px;color:#2a2521;">
          ${s.items.map((it) => `<li style="margin:4px 0;">${it}</li>`).join('')}
        </ul>`
      )
      .join('');

    const sectionsText = pending
      .map((s) => `\n${s.title}\n${s.items.map((it) => `  - ${it}`).join('\n')}`)
      .join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2521;">
        <div style="background:#ed6a2a;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;">La Margarita — Checklist de salida</h2>
        </div>
        <div style="border:1px solid #efe9e3;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
          <p>Hola ${user.name}, todavía te quedan <strong>${totalPending}</strong> cosas por revisar antes de irte:</p>
          ${sectionsHtml}
          <p style="margin-top:24px;color:#7a726a;font-size:13px;">Gracias por dejar todo prolijo. — La Margarita</p>
        </div>
      </div>`;

    const text =
      `La Margarita — Checklist de salida\n\n` +
      `Hola ${user.name}, te quedan ${totalPending} cosas por revisar:\n${sectionsText}\n\n` +
      `Gracias por colaborar — La Margarita`;

    try {
      await sendEmail({
        to: user.email,
        subject: `Checklist de salida — te quedan ${totalPending} cosas`,
        html,
        text,
      });
    } catch (mailError) {
      console.error('[checklist/remind] error enviando email:', mailError);
      return NextResponse.json(
        { ok: false, msg: 'No se pudo enviar el email. Intentá más tarde.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { ok: false, msg: 'Sesión no válida. Volvé a iniciar sesión.' },
        { status: 401 }
      );
    }
    console.error('[checklist/remind]', error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
