import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { validateJWT } from '@/lib/middleware';
import { isAdminUser, isValidMongoId } from '@/lib/eventOwnership';
import { ApiErrorHandler } from '@/lib/errorHandler';
import { resolveLimiteAmigos } from '@/lib/amigosQuota';

/**
 * Administración del cupo anual de Amigos por persona.
 *
 * No hay pantalla de administración en la app (la arquitectura actual no la
 * tiene y no hacía falta inventarla), pero el límite se puede consultar y
 * cambiar desde acá sin tocar código, o con `scripts/set-amigos-limits.mjs`.
 *
 * Solo para administradores (ver ADMIN_USER_NAMES en lib/eventOwnership.ts).
 */

function forbidden() {
  return NextResponse.json(
    { ok: false, msg: 'No tenés permisos para administrar los cupos.' },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = await validateJWT(request);
    if (!isAdminUser({ name: decoded.name })) return forbidden();

    const users = await User.find()
      .select('name email limiteAmigosAnual')
      .sort({ name: 1 })
      .lean<{ _id: unknown; name: string; email: string; limiteAmigosAnual?: number | null }[]>();

    return NextResponse.json({
      ok: true,
      usuarios: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        limiteAmigosAnual: resolveLimiteAmigos(u.limiteAmigosAnual),
      })),
    });
  } catch (error) {
    return handleError(error, 'GET /api/admin/amigos-limits', request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = await validateJWT(request);
    if (!isAdminUser({ name: decoded.name })) return forbidden();

    const body = await request.json();
    const { userId, limiteAmigosAnual } = body ?? {};

    if (!isValidMongoId(userId)) {
      return NextResponse.json({ ok: false, msg: 'userId inválido' }, { status: 400 });
    }

    // `null` = sin límite. Cualquier otra cosa debe ser un entero >= 0.
    const esIlimitado = limiteAmigosAnual === null;
    if (
      !esIlimitado &&
      (typeof limiteAmigosAnual !== 'number' ||
        !Number.isInteger(limiteAmigosAnual) ||
        limiteAmigosAnual < 0)
    ) {
      return NextResponse.json(
        { ok: false, msg: 'limiteAmigosAnual debe ser un entero >= 0, o null para sin límite.' },
        { status: 400 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { limiteAmigosAnual: esIlimitado ? null : limiteAmigosAnual } },
      { new: true }
    )
      .select('name email limiteAmigosAnual')
      .lean<{ _id: unknown; name: string; email: string; limiteAmigosAnual?: number | null }>();

    if (!updated) {
      return NextResponse.json({ ok: false, msg: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      usuario: {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        limiteAmigosAnual: resolveLimiteAmigos(updated.limiteAmigosAnual),
      },
    });
  } catch (error) {
    return handleError(error, 'PATCH /api/admin/amigos-limits', request);
  }
}

function handleError(error: unknown, context: string, request: NextRequest) {
  ApiErrorHandler.logError(error, context, { url: request.url });

  if (error instanceof Error && error.message.includes('Token')) {
    const errorResponse = ApiErrorHandler.handleAuthError(error.message);
    return NextResponse.json(
      { ok: false, msg: errorResponse.userMessage, error: errorResponse.technicalMessage },
      { status: errorResponse.statusCode }
    );
  }

  const errorResponse = ApiErrorHandler.handleServerError(error, context);
  return NextResponse.json(
    { ok: false, msg: errorResponse.userMessage, error: errorResponse.technicalMessage },
    { status: errorResponse.statusCode }
  );
}
