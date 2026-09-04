import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import '@/lib/models/Event';
import '@/lib/models/User';
import { validateJWT } from '@/lib/middleware';
import { ApiErrorHandler } from '@/lib/errorHandler';
import { getAmigosQuotaState } from '@/lib/amigosQuotaDb';
import { getReservaYear } from '@/lib/amigosQuota';
import { isValidMongoId } from '@/lib/eventOwnership';

/**
 * Cupo anual de reservas "Amigos" de la persona autenticada.
 * Solo informativo: la restricción real se aplica al guardar la reserva.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const decoded = await validateJWT(request);

    const yearParam = request.nextUrl.searchParams.get('year');
    const year = yearParam ? Number(yearParam) : getReservaYear(new Date());

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ ok: false, msg: 'Año inválido' }, { status: 400 });
    }

    // Al editar una reserva, esa reserva no debe contarse contra sí misma.
    const excludeParam = request.nextUrl.searchParams.get('excludeEventId');
    const excludeEventId = isValidMongoId(excludeParam ?? undefined) ? excludeParam! : undefined;

    const quota = await getAmigosQuotaState(decoded.uid, year, excludeEventId);

    return NextResponse.json({ ok: true, quota });
  } catch (error) {
    const context = 'GET /api/amigos-quota';
    ApiErrorHandler.logError(error, context, { url: request.url, method: 'GET' });

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
}
