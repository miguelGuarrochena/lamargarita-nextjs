/**
 * Helper de envío de email.
 *
 * Usa Resend (https://resend.com) vía su API REST si están configuradas
 * las variables RESEND_API_KEY y EMAIL_FROM. Si no, escribe el contenido
 * en la consola del servidor (útil en desarrollo, sin romper el flujo).
 */
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // Sin proveedor configurado: log en consola para no bloquear el desarrollo.
  if (!apiKey || !from) {
    console.warn(
      '[email] RESEND_API_KEY/EMAIL_FROM no configurados. Email no enviado. Contenido:\n',
      { to, subject, text: text ?? html }
    );
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fallo al enviar email (${response.status}): ${detail}`);
  }
}

/** Plantilla del email de recuperación de contraseña. */
export function buildResetPasswordEmail(name: string, resetUrl: string) {
  const subject = 'Recuperá tu contraseña - La Margarita';
  const text =
    `Hola ${name},\n\n` +
    `Recibimos un pedido para restablecer tu contraseña.\n` +
    `Entrá a este enlace para crear una nueva (vence en 1 hora):\n${resetUrl}\n\n` +
    `Si no fuiste vos, ignorá este mensaje.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
      <h2 style="color: #2b8a3e;">La Margarita</h2>
      <p>Hola <strong>${name}</strong>,</p>
      <p>Recibimos un pedido para restablecer tu contraseña.</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2b8a3e;color:#fff;padding:12px 20px;
                  border-radius:6px;text-decoration:none;">
          Crear nueva contraseña
        </a>
      </p>
      <p style="color:#888;font-size:13px;">El enlace vence en 1 hora. Si no pediste esto, ignorá este mensaje.</p>
    </div>`;
  return { subject, text, html };
}
