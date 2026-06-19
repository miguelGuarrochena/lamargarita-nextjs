import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import '@/lib/models/User'; // registra el schema Usuario para populate
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Argentina = UTC-3 (sin horario de verano).
const ART_OFFSET_HOURS = 3;

function buildReminderEmail(name: string, checklistUrl: string) {
  const subject = 'Hoy te vas de La Margarita — no te olvides del checklist 🌿';
  const text =
    `Hola ${name},\n\n` +
    `Hoy es tu día de salida de La Margarita. Antes de irte, ` +
    `pasá por el checklist de check-out para dejar todo en orden:\n${checklistUrl}\n\n` +
    `¡Gracias por colaborar! — La Margarita`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#243230;">
      <div style="background:#1f9d83;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;">La Margarita</h2>
      </div>
      <div style="border:1px solid #e4ece8;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <p>Hola <strong>${name}</strong>,</p>
        <p>Hoy es tu día de salida. Antes de irte, repasá el checklist de check-out
           para dejar todo prolijo para la próxima familia.</p>
        <p style="margin:24px 0;">
          <a href="${checklistUrl}"
             style="display:inline-block;background:#1f9d83;color:#fff;padding:12px 22px;
                    border-radius:8px;text-decoration:none;">
            Abrir el checklist
          </a>
        </p>
        <p style="color:#6c7a76;font-size:13px;">¡Gracias por colaborar! — La Margarita</p>
      </div>
    </div>`;
  return { subject, text, html };
}

export async function GET(request: NextRequest) {
  // Seguridad: Vercel Cron envía Authorization: Bearer <CRON_SECRET> si está definido.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 });
    }
  }

  try {
    await dbConnect();

    // Rango del día de HOY en horario de Argentina (medianoche ART = 03:00 UTC).
    const now = new Date();
    const artNow = new Date(now.getTime() - ART_OFFSET_HOURS * 60 * 60 * 1000);
    const y = artNow.getUTCFullYear();
    const m = artNow.getUTCMonth();
    const d = artNow.getUTCDate();
    const dayStart = new Date(Date.UTC(y, m, d, ART_OFFSET_HOURS, 0, 0));
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    // Reservas que terminan (salida) hoy.
    const events = await Event.find({
      end: { $gte: dayStart, $lt: dayEnd },
    }).populate('user', 'name email');

    // Un solo email por usuario, aunque tenga varias reservas que terminan hoy.
    const usersByEmail = new Map<string, { name: string; email: string }>();
    for (const ev of events) {
      const u = ev.user as unknown as { name?: string; email?: string } | null;
      if (u?.email) {
        usersByEmail.set(u.email, { name: u.name || 'familia', email: u.email });
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checklistUrl = `${baseUrl}/checklist`;

    let sent = 0;
    for (const u of usersByEmail.values()) {
      const { subject, html, text } = buildReminderEmail(u.name, checklistUrl);
      try {
        await sendEmail({ to: u.email, subject, html, text });
        sent += 1;
      } catch (mailError) {
        console.error('[cron checkout-reminders] email falló para', u.email, mailError);
      }
    }

    return NextResponse.json({
      ok: true,
      fecha: dayStart.toISOString(),
      reservasQueTerminanHoy: events.length,
      emailsEnviados: sent,
    });
  } catch (error) {
    console.error('[cron checkout-reminders]', error);
    return NextResponse.json({ ok: false, msg: 'Error en el cron' }, { status: 500 });
  }
}
