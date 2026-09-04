/**
 * Flujo HTTP real de creación de reservas: payload JSON -> route handler ->
 * servicio -> documento guardado.
 *
 * Los tests de `amigosQuotaDb` entran por el servicio y se saltan el handler;
 * este entra por donde entra el navegador.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { FakeEventModel, FakeUserModel } from '@/lib/__tests__/fakeMongo';

const USER_ID = new mongoose.Types.ObjectId().toHexString();

vi.mock('@/lib/mongodb', () => ({ default: async () => undefined }));
vi.mock('@/lib/models/Event', () => ({ default: FakeEventModel }));
vi.mock('@/lib/models/User', () => ({ default: FakeUserModel }));
vi.mock('@/lib/middleware', () => ({
  validateJWT: async () => ({ uid: USER_ID, name: 'Normal' }),
}));

const { POST } = await import('./route');

/** Arma el request tal como lo manda el formulario. */
function crearRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify(body),
  }) as never;
}

const payloadBase = {
  title: 'Fin de semana',
  notes: '',
  booking: 'CT',
  pax: 4,
  start: new Date('2026-11-20T15:00:00Z').toISOString(),
  end: new Date('2026-11-22T15:00:00Z').toISOString(),
};

beforeEach(() => {
  FakeEventModel.reset();
  FakeUserModel.seed([{ _id: USER_ID, name: 'Normal' }]);
});

describe('POST /api/events — tipoInvitado del formulario', () => {
  it('1. seleccionando "Amigos" guarda la reserva con tipoInvitado = Amigos', async () => {
    const res = await POST(crearRequest({ ...payloadBase, tipoInvitado: 'Amigos' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.evento.tipoInvitado).toBe('Amigos');

    // Y quedó persistido en la colección.
    expect(FakeEventModel.store).toHaveLength(1);
    expect(FakeEventModel.store[0].tipoInvitado).toBe('Amigos');
  });

  it('2. seleccionando "Familiar" guarda la reserva con tipoInvitado = Familiar', async () => {
    const res = await POST(crearRequest({ ...payloadBase, tipoInvitado: 'Familiar' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.evento.tipoInvitado).toBe('Familiar');
    expect(FakeEventModel.store[0].tipoInvitado).toBe('Familiar');
  });

  it('3. sin seleccionar tipo, sigue rechazando con el mensaje actual', async () => {
    const res = await POST(crearRequest(payloadBase));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.msg).toBe('Tenés que elegir el tipo de invitado: Familiar o Amigos.');
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('3b. un valor inventado también se rechaza', async () => {
    const res = await POST(crearRequest({ ...payloadBase, tipoInvitado: 'Compañeros' }));
    expect(res.status).toBe(400);
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('el nombre viejo del campo ya no sirve para crear una reserva', async () => {
    // Si algún cliente viejo siguiera mandando `motivo: "Amigos"`, el servidor
    // debe rechazarlo: `motivo` es texto libre y no define el tipo de invitado.
    const res = await POST(crearRequest({ ...payloadBase, motivo: 'Amigos' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(FakeEventModel.store).toHaveLength(0);
    // El diagnóstico deja ver que no llegó el campo, sin adivinar.
    expect(data.tipoInvitadoRecibido).toBeNull();
  });

  it('la respuesta dice qué valor llegó cuando es inválido', async () => {
    const res = await POST(crearRequest({ ...payloadBase, tipoInvitado: 'amigos' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.tipoInvitadoRecibido).toBe('amigos');
  });

  it('una marca administrativa (feriado) no necesita tipoInvitado', async () => {
    const res = await POST(crearRequest({ ...payloadBase, booking: 'FR' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.evento.tipoInvitado).toBeUndefined();
  });
});
