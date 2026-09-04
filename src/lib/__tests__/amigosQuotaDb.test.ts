/**
 * Flujo de reservas de punta a punta contra un Mongo falso que replica el
 * índice único del cupo. Cubre los escenarios de la regla de negocio:
 * tipoInvitado obligatorio, límites por persona, cancelación, año calendario y
 * concurrencia.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { FakeEventModel, FakeUserModel } from './fakeMongo';

vi.mock('@/lib/models/Event', () => ({ default: FakeEventModel }));
vi.mock('@/lib/models/User', () => ({ default: FakeUserModel }));

const {
  cancelReservation,
  createReservation,
  updateReservation,
  getAmigosQuotaState,
} = await import('@/lib/amigosQuotaDb');
const {
  AmigosQuotaExceededError,
  CancelacionFueraDePlazoError,
  TipoInvitadoRequeridoError,
  getReservaYear,
} = await import('@/lib/amigosQuota');

const HORA = 60 * 60 * 1000;

/**
 * Reloj congelado: la ventana de cancelación y el año calendario dependen de
 * "ahora", así que lo fijamos para que los tests no cambien de resultado según
 * el día en que se corran.
 */
const AHORA = new Date('2026-06-01T12:00:00Z');

/** Fecha relativa al ahora congelado. */
const enHoras = (h: number) => new Date(AHORA.getTime() + h * HORA);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});

afterAll(() => {
  vi.useRealTimers();
});

/**
 * Inserta una reserva directamente en la colección, sin pasar por el servicio.
 * Sirve para armar el estado previo de la base (con o sin `tipoInvitado`).
 */
function seedReserva(fields: Record<string, unknown>) {
  const doc: Record<string, unknown> = {
    _id: oid(),
    title: 'Reserva existente',
    booking: 'CT',
    tipoInvitado: 'Amigos',
    pax: 4,
    start: new Date('2026-04-10T15:00:00Z'),
    end: new Date('2026-04-12T15:00:00Z'),
    ...fields,
  };
  // Un `undefined` explícito significa "el campo no existe en la base".
  for (const [k, v] of Object.entries(doc)) if (v === undefined) delete doc[k];
  FakeEventModel.store.push(doc);
  return doc;
}

const oid = () => new mongoose.Types.ObjectId().toHexString();

// Personas de prueba. Los límites son datos, no condiciones sobre el nombre.
const PERSONA_NORMAL = oid(); // sin configurar -> default 1
const GG = oid(); // 4 por año
const JUAN_PABLO = oid(); // sin límite
const SIN_AMIGOS = oid(); // 0: no puede reservar Amigos

function reserva(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Fin de semana',
    booking: 'CT',
    tipoInvitado: 'Amigos',
    pax: 4,
    start: new Date('2026-06-12T15:00:00Z'),
    end: new Date('2026-06-14T15:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  FakeEventModel.reset();
  FakeUserModel.seed([
    { _id: PERSONA_NORMAL, name: 'Persona Normal' },
    { _id: GG, name: 'GG', limiteAmigosAnual: 4 },
    { _id: JUAN_PABLO, name: 'Juan Pablo', limiteAmigosAnual: null },
    { _id: SIN_AMIGOS, name: 'Sin Amigos', limiteAmigosAnual: 0 },
  ]);
});

describe('tipoInvitado obligatorio', () => {
  it('no se puede crear una reserva sin tipoInvitado', async () => {
    await expect(
      createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: undefined }))
    ).rejects.toBeInstanceOf(TipoInvitadoRequeridoError);
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('no se puede crear una reserva con un tipoInvitado inventado', async () => {
    await expect(
      createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Trabajo' }))
    ).rejects.toBeInstanceOf(TipoInvitadoRequeridoError);
  });

  it('tampoco se puede editar una reserva dejándola sin tipoInvitado', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));
    await expect(
      updateReservation(
        PERSONA_NORMAL,
        String(creada._id),
        reserva({ tipoInvitado: undefined }),
        creada
      )
    ).rejects.toBeInstanceOf(TipoInvitadoRequeridoError);
  });

  it('los feriados/vacaciones administrativos no piden tipoInvitado', async () => {
    const feriado = await createReservation(GG, reserva({ booking: 'FR', tipoInvitado: undefined }));
    expect(feriado.tipoInvitado).toBeUndefined();
    expect(feriado.amigosSlot).toBeUndefined();
  });
});

describe('Familiar no consume el cupo de Amigos', () => {
  it('permite muchas reservas Familiar aunque el límite de Amigos sea 1', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));
    }
    expect(FakeEventModel.store).toHaveLength(5);

    const quota = await getAmigosQuotaState(PERSONA_NORMAL, 2026);
    expect(quota.usadas).toBe(0);
    expect(quota.restantes).toBe(1);

    // Y todavía puede hacer su reserva de Amigos.
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('una reserva Familiar no reserva cupo aunque el límite sea 0', async () => {
    await expect(
      createReservation(SIN_AMIGOS, reserva({ tipoInvitado: 'Familiar' }))
    ).resolves.toBeTruthy();
  });
});

describe('límite anual por persona', () => {
  it('una persona sin configurar puede hacer 1 reserva de Amigos', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    expect(creada.tipoInvitado).toBe('Amigos');
    expect(creada.amigosYear).toBe(2026);
    expect(creada.amigosSlot).toBe(1);
  });

  it('una persona sin configurar no puede hacer una segunda reserva activa de Amigos', async () => {
    await createReservation(PERSONA_NORMAL, reserva());
    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('GG puede hacer hasta 4', async () => {
    for (let i = 0; i < 4; i += 1) {
      await createReservation(GG, reserva());
    }
    const quota = await getAmigosQuotaState(GG, 2026);
    expect(quota).toMatchObject({ limite: 4, usadas: 4, restantes: 0 });
  });

  it('GG no puede hacer una quinta', async () => {
    for (let i = 0; i < 4; i += 1) await createReservation(GG, reserva());
    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(4);
  });

  it('Juan Pablo puede hacer múltiples reservas de Amigos', async () => {
    for (let i = 0; i < 7; i += 1) await createReservation(JUAN_PABLO, reserva());
    const quota = await getAmigosQuotaState(JUAN_PABLO, 2026);
    expect(quota).toMatchObject({ limite: null, usadas: 7, restantes: null });
  });

  it('el límite 0 impide reservar Amigos', async () => {
    await expect(createReservation(SIN_AMIGOS, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('el cupo de una persona no afecta al de otra', async () => {
    await createReservation(PERSONA_NORMAL, reserva());
    await expect(createReservation(GG, reserva())).resolves.toBeTruthy();
  });
});

describe('cancelación', () => {
  it('cancelar una reserva de Amigos libera el cupo', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(1);

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    // Cancelar = borrar la reserva (comportamiento actual de la app).
    await FakeEventModel.findByIdAndDelete(String(creada._id));

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('pasar una reserva de Amigos a Familiar también libera el cupo', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ tipoInvitado: 'Familiar' }),
      creada
    );

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });
});

describe('año calendario', () => {
  it('una reserva de otro año no consume el límite del año actual', async () => {
    await createReservation(
      PERSONA_NORMAL,
      reserva({
        start: new Date('2025-06-12T15:00:00Z'),
        end: new Date('2025-06-14T15:00:00Z'),
      })
    );

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2025)).usadas).toBe(1);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);

    // El contador arranca de cero en el año siguiente.
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('el cupo se agota por año, no por ventana de 365 días', async () => {
    await createReservation(
      PERSONA_NORMAL,
      reserva({
        start: new Date('2026-12-20T15:00:00Z'),
        end: new Date('2026-12-22T15:00:00Z'),
      })
    );

    // Tres semanas después, pero ya es 2027: hay cupo nuevo.
    await expect(
      createReservation(
        PERSONA_NORMAL,
        reserva({
          start: new Date('2027-01-10T15:00:00Z'),
          end: new Date('2027-01-12T15:00:00Z'),
        })
      )
    ).resolves.toBeTruthy();

    // Pero una segunda en diciembre 2026 sigue bloqueada.
    await expect(
      createReservation(
        PERSONA_NORMAL,
        reserva({
          start: new Date('2026-12-27T15:00:00Z'),
          end: new Date('2026-12-28T15:00:00Z'),
        })
      )
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });
});

describe('edición', () => {
  it('editar una reserva de Amigos no consume un cupo extra', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ title: 'Título nuevo' }),
      creada
    );

    expect(editada?.title).toBe('Título nuevo');
    expect(editada?.amigosSlot).toBe(creada.amigosSlot);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(1);
  });

  it('pasar una reserva Familiar a Amigos sí valida el cupo', async () => {
    await createReservation(PERSONA_NORMAL, reserva()); // usa el único cupo
    const familiar = await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));

    await expect(
      updateReservation(PERSONA_NORMAL, String(familiar._id), reserva(), familiar)
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('mover una reserva de Amigos a un año sin cupo usado es válido', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    const movida = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({
        start: new Date('2027-06-12T15:00:00Z'),
        end: new Date('2027-06-14T15:00:00Z'),
      }),
      creada
    );

    expect(movida?.amigosYear).toBe(2027);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2027)).usadas).toBe(1);
  });
});

describe('concurrencia', () => {
  it('dos solicitudes simultáneas no permiten superar un límite de 1', async () => {
    const resultados = await Promise.allSettled([
      createReservation(PERSONA_NORMAL, reserva()),
      createReservation(PERSONA_NORMAL, reserva()),
    ]);

    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const fallidas = resultados.filter((r) => r.status === 'rejected');

    expect(ok).toHaveLength(1);
    expect(fallidas).toHaveLength(1);
    expect((fallidas[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('cinco solicitudes simultáneas de GG dejan exactamente 4 reservas', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () => createReservation(GG, reserva()))
    );

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(FakeEventModel.store).toHaveLength(4);

    // Cada reserva se quedó con un cupo distinto: el índice único no se violó.
    const slots = FakeEventModel.store.map((d) => d.amigosSlot).sort();
    expect(slots).toEqual([1, 2, 3, 4]);
  });

  it('las solicitudes simultáneas de Juan Pablo pasan todas, con cupos distintos', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () => createReservation(JUAN_PABLO, reserva()))
    );

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    const slots = FakeEventModel.store.map((d) => d.amigosSlot);
    expect(new Set(slots).size).toBe(5);
  });

  it('las solicitudes simultáneas de personas distintas no se pisan', async () => {
    const resultados = await Promise.allSettled([
      createReservation(PERSONA_NORMAL, reserva()),
      createReservation(GG, reserva()),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
  });
});

describe('reservas de Amigos ya existentes en la base', () => {
  it('una reserva sin cupo asignado igual consume el límite', () => {
    seedReserva({ user: PERSONA_NORMAL });

    return expect(getAmigosQuotaState(PERSONA_NORMAL, 2026)).resolves.toMatchObject({
      limite: 1,
      usadas: 1,
      restantes: 0,
    });
  });

  it('una persona normal con 1 reserva de Amigos preexistente no puede hacer otra', async () => {
    seedReserva({ user: PERSONA_NORMAL });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('GG con 2 preexistentes puede hacer 2 más, pero no una quinta', async () => {
    seedReserva({ user: GG });
    seedReserva({ user: GG });

    expect((await getAmigosQuotaState(GG, 2026)).restantes).toBe(2);

    await createReservation(GG, reserva());
    await createReservation(GG, reserva());

    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(4);
  });

  it('Juan Pablo sigue reservando aunque tenga preexistentes', async () => {
    seedReserva({ user: JUAN_PABLO });
    seedReserva({ user: JUAN_PABLO });

    await expect(createReservation(JUAN_PABLO, reserva())).resolves.toBeTruthy();
    expect((await getAmigosQuotaState(JUAN_PABLO, 2026)).usadas).toBe(3);
  });

  it('una reserva preexistente Familiar no consume el límite de Amigos', async () => {
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: 'Familiar' });

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('una reserva preexistente de otro año no consume el cupo del año actual', async () => {
    seedReserva({
      user: PERSONA_NORMAL,
      start: new Date('2025-04-10T15:00:00Z'),
      end: new Date('2025-04-12T15:00:00Z'),
    });

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2025)).usadas).toBe(1);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('no modifica ni borra las reservas existentes al crear una nueva', async () => {
    const historica = seedReserva({ user: GG });
    const snapshot = JSON.stringify(historica);

    await createReservation(GG, reserva());

    const guardada = FakeEventModel.store.find((d) => d._id === historica._id);
    expect(guardada).toBeDefined();
    expect(JSON.stringify(guardada)).toBe(snapshot);
    expect(guardada?.amigosSlot).toBeUndefined();
  });

  it('la nueva reserva no pisa el cupo de una preexistente que sí tenía slot', async () => {
    seedReserva({ user: GG, amigosYear: 2026, amigosSlot: 1 });

    const nueva = await createReservation(GG, reserva());
    expect(nueva.amigosSlot).toBe(2);
  });

  it('cancelar una preexistente libera el cupo', async () => {
    const historica = seedReserva({ user: PERSONA_NORMAL, start: enHoras(72) });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    await cancelReservation(String(historica._id), historica as never);

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('las preexistentes también cuentan frente a solicitudes concurrentes', async () => {
    seedReserva({ user: GG });
    seedReserva({ user: GG });
    seedReserva({ user: GG });

    const resultados = await Promise.allSettled([
      createReservation(GG, reserva()),
      createReservation(GG, reserva()),
      createReservation(GG, reserva()),
    ]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(FakeEventModel.store).toHaveLength(4);
  });
});

describe('ventana de cancelación de 24 horas', () => {
  it('cancela cuando faltan 24 horas o más', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(48), end: enHoras(72) })
    );

    await expect(cancelReservation(String(creada._id), creada as never)).resolves.toBeUndefined();
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('rechaza cuando faltan menos de 24 horas', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(5), end: enHoras(30) })
    );

    await expect(
      cancelReservation(String(creada._id), creada as never)
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);

    // Y la reserva sigue ahí.
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('rechaza una reserva que ya empezó, sin excepción por urgencia', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(-2), end: enHoras(24) })
    );

    await expect(
      cancelReservation(String(creada._id), creada as never)
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('una cancelación rechazada NO libera el cupo', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(5), end: enHoras(30) })
    );

    await expect(
      cancelReservation(String(creada._id), creada as never)
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(1);
    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('una cancelación válida libera el cupo y permite reservar de nuevo', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(48), end: enHoras(72) })
    );

    await cancelReservation(String(creada._id), creada as never);

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('los feriados/vacaciones administrativos se pueden borrar siempre', async () => {
    const feriado = await createReservation(
      GG,
      reserva({ booking: 'FR', tipoInvitado: undefined, start: enHoras(-100), end: enHoras(-90) })
    );

    await expect(cancelReservation(String(feriado._id), feriado as never)).resolves.toBeUndefined();
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('una reserva Familiar también respeta la ventana de 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ tipoInvitado: 'Familiar', start: enHoras(3), end: enHoras(30) })
    );

    await expect(
      cancelReservation(String(creada._id), creada as never)
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);
  });
});

describe('la edición no puede esquivar la ventana de cancelación', () => {
  it('no permite pasar una reserva de Amigos a Familiar dentro de las 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(5), end: enHoras(30) })
    );

    await expect(
      updateReservation(
        PERSONA_NORMAL,
        String(creada._id),
        reserva({ tipoInvitado: 'Familiar', start: enHoras(5), end: enHoras(30) }),
        creada
      )
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(1);
  });

  it('no permite mover una reserva de Amigos a otro año dentro de las 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(5), end: enHoras(30) })
    );

    await expect(
      updateReservation(
        PERSONA_NORMAL,
        String(creada._id),
        reserva({
          start: new Date('2027-05-01T15:00:00Z'),
          end: new Date('2027-05-03T15:00:00Z'),
        }),
        creada
      )
    ).rejects.toBeInstanceOf(CancelacionFueraDePlazoError);
  });

  it('sí permite editar otros datos de una reserva de Amigos dentro de las 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(5), end: enHoras(30) })
    );

    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ title: 'Cambio de nombre', pax: 8, start: enHoras(5), end: enHoras(30) }),
      creada
    );

    expect(editada?.title).toBe('Cambio de nombre');
    expect(editada?.pax).toBe(8);
    expect(editada?.amigosSlot).toBe(creada.amigosSlot);
  });

  it('permite liberar el cupo por edición si faltan más de 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(48), end: enHoras(72) })
    );

    await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ tipoInvitado: 'Familiar', start: enHoras(48), end: enHoras(72) }),
      creada
    );

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
  });

  it('editar una reserva Familiar dentro de las 24 h no toca la regla', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ tipoInvitado: 'Familiar', start: enHoras(3), end: enHoras(30) })
    );

    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ tipoInvitado: 'Familiar', title: 'Otro título', start: enHoras(3), end: enHoras(30) }),
      creada
    );

    expect(editada?.title).toBe('Otro título');
  });
});

describe('regla definitiva del cupo de Amigos', () => {
  it('1. Familiar es ilimitado', async () => {
    for (let i = 0; i < 12; i += 1) {
      await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));
    }
    expect(FakeEventModel.store).toHaveLength(12);
  });

  it('2. las reservas Familiar nunca afectan el cupo de Amigos', async () => {
    for (let i = 0; i < 6; i += 1) {
      await createReservation(GG, reserva({ tipoInvitado: 'Familiar' }));
    }
    expect(await getAmigosQuotaState(GG, 2026)).toMatchObject({ usadas: 0, restantes: 4 });

    // Y siguen sin consumir cupo después de reservar Amigos.
    await createReservation(GG, reserva());
    await createReservation(GG, reserva({ tipoInvitado: 'Familiar' }));
    expect(await getAmigosQuotaState(GG, 2026)).toMatchObject({ usadas: 1, restantes: 3 });
  });

  it('3. usuario normal con 0 reservas de Amigos puede reservar', async () => {
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      limite: 1,
      usadas: 0,
      restantes: 1,
    });
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('4. usuario normal con 1 reserva de Amigos no puede crear otra', async () => {
    await createReservation(PERSONA_NORMAL, reserva());
    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('5. GG con 3 reservas de Amigos puede crear otra', async () => {
    for (let i = 0; i < 3; i += 1) await createReservation(GG, reserva());
    expect(await getAmigosQuotaState(GG, 2026)).toMatchObject({ usadas: 3, restantes: 1 });
    await expect(createReservation(GG, reserva())).resolves.toBeTruthy();
  });

  it('6. GG con 4 reservas de Amigos no puede crear otra', async () => {
    for (let i = 0; i < 4; i += 1) await createReservation(GG, reserva());
    expect(await getAmigosQuotaState(GG, 2026)).toMatchObject({ usadas: 4, restantes: 0 });
    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('7. Juan Pablo es ilimitado', async () => {
    for (let i = 0; i < 10; i += 1) await createReservation(JUAN_PABLO, reserva());
    expect(await getAmigosQuotaState(JUAN_PABLO, 2026)).toMatchObject({
      limite: null,
      usadas: 10,
      restantes: null,
    });
  });

  it('8. una reserva FUTURA de Amigos (octubre) cuenta para el cupo del año', async () => {
    // Hoy es junio 2026; la reserva es para octubre 2026: todavía no ocurrió,
    // pero ya consume el cupo anual.
    const octubre = await createReservation(
      PERSONA_NORMAL,
      reserva({
        title: 'Octubre con amigos',
        start: new Date('2026-10-15T15:00:00Z'),
        end: new Date('2026-10-18T15:00:00Z'),
      })
    );
    expect(octubre.start.getTime()).toBeGreaterThan(AHORA.getTime());

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });

    await expect(
      createReservation(
        PERSONA_NORMAL,
        reserva({
          start: new Date('2026-12-01T15:00:00Z'),
          end: new Date('2026-12-03T15:00:00Z'),
        })
      )
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('8b. una reserva de octubre cuenta aunque amigosYear esté desincronizado', async () => {
    // El año se deriva del `start`, no de `amigosYear`: una reserva movida de
    // fecha por fuera de este servicio no puede volverse invisible al cupo.
    seedReserva({
      user: PERSONA_NORMAL,
      start: new Date('2026-10-15T15:00:00Z'),
      end: new Date('2026-10-18T15:00:00Z'),
      amigosYear: 2025,
      amigosSlot: 1,
    });

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2025)).toMatchObject({ usadas: 0 });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('9. una reserva cancelada no genera falsos bloqueos', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(48), end: enHoras(72) })
    );
    await cancelReservation(String(creada._id), creada as never);

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 0,
      restantes: 1,
    });
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('10. el backend rechaza aunque el frontend no haya bloqueado', async () => {
    await createReservation(PERSONA_NORMAL, reserva());

    // Request "cruda", como si alguien salteara el formulario por completo:
    // sin pasar por el estado del aviso ni por el botón deshabilitado.
    await expect(
      createReservation(PERSONA_NORMAL, {
        title: 'Salteando el formulario',
        booking: 'PR',
        tipoInvitado: 'Amigos',
        pax: 2,
        start: new Date('2026-11-20T15:00:00Z'),
        end: new Date('2026-11-22T15:00:00Z'),
      })
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);

    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('10b. el backend ignora un cupo falseado en el payload del cliente', async () => {
    await createReservation(PERSONA_NORMAL, reserva());

    // El cliente intenta inyectar amigosYear/amigosSlot para colarse.
    await expect(
      createReservation(PERSONA_NORMAL, {
        ...reserva(),
        amigosYear: 1999,
        amigosSlot: 99,
      })
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('el cupo mostrado al editar no se cuenta contra sí mismo', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());

    // Sin excluirla, el formulario diría "0 disponibles" al abrir su propia reserva.
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ restantes: 0 });
    expect(
      await getAmigosQuotaState(PERSONA_NORMAL, 2026, String(creada._id))
    ).toMatchObject({ usadas: 0, restantes: 1 });
  });
});

/**
 * El caso reportado: hoy es junio de 2026 y existe una reserva de Amigos con
 * fecha de octubre de 2026. Esa reserva ya consume el cupo de 2026.
 */
describe('BUG reportado: reservas futuras del mismo año', () => {
  const OCTUBRE_2026 = {
    start: new Date('2026-10-15T15:00:00Z'),
    end: new Date('2026-10-18T15:00:00Z'),
  };
  const OCTUBRE_2027 = {
    start: new Date('2027-10-15T15:00:00Z'),
    end: new Date('2027-10-18T15:00:00Z'),
  };

  it('hoy es anterior a octubre de 2026', () => {
    expect(AHORA.getTime()).toBeLessThan(OCTUBRE_2026.start.getTime());
    expect(getReservaYear(AHORA)).toBe(2026);
  });

  it('una reserva de Amigos de octubre 2026 da usadas = 1 y restantes = 0', async () => {
    await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2026));

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toEqual({
      year: 2026,
      limite: 1,
      usadas: 1,
      restantes: 0,
    });
  });

  it('con esa reserva de octubre, no puede crear otra de Amigos en 2026', async () => {
    await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2026));

    await expect(
      createReservation(
        PERSONA_NORMAL,
        reserva({
          start: new Date('2026-11-20T15:00:00Z'),
          end: new Date('2026-11-22T15:00:00Z'),
        })
      )
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('cuenta igual sin pasar el año: el default es el año en curso', async () => {
    await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2026));
    expect(await getAmigosQuotaState(PERSONA_NORMAL)).toMatchObject({
      year: 2026,
      usadas: 1,
      restantes: 0,
    });
  });

  it('una reserva de octubre 2027 NO consume el cupo de 2026', async () => {
    await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2027));

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 0,
      restantes: 1,
    });
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2027)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });

    // Y sigue pudiendo reservar en 2026.
    await expect(
      createReservation(
        PERSONA_NORMAL,
        reserva({
          start: new Date('2026-11-20T15:00:00Z'),
          end: new Date('2026-11-22T15:00:00Z'),
        })
      )
    ).resolves.toBeTruthy();
  });

  it('la consulta no filtra por fecha: pasada, en curso y futura cuentan igual', async () => {
    // Tres reservas de Amigos de 2026 para Juan Pablo (ilimitado): una que ya
    // pasó, una en curso y una futura. Las tres deben contarse.
    await createReservation(
      JUAN_PABLO,
      reserva({ start: new Date('2026-02-01T15:00:00Z'), end: new Date('2026-02-03T15:00:00Z') })
    );
    await createReservation(JUAN_PABLO, reserva({ start: enHoras(-12), end: enHoras(36) }));
    await createReservation(JUAN_PABLO, reserva(OCTUBRE_2026));

    expect(await getAmigosQuotaState(JUAN_PABLO, 2026)).toMatchObject({ usadas: 3 });
  });

  it('excludeEventId sigue funcionando al editar la reserva de octubre', async () => {
    const octubre = await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2026));

    // Sin excluir: el uso real del año sigue siendo 1 (lo que muestra el aviso).
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 1 });

    // Excluyéndola: no se cuenta contra sí misma, así que guardarla no se bloquea.
    expect(
      await getAmigosQuotaState(PERSONA_NORMAL, 2026, String(octubre._id))
    ).toMatchObject({ usadas: 0, restantes: 1 });

    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(octubre._id),
      reserva({ ...OCTUBRE_2026, title: 'Octubre editado' }),
      octubre
    );
    expect(editada?.title).toBe('Octubre editado');
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 1 });
  });

  it('mover la reserva de octubre a otra fecha del mismo año no rompe el cupo', async () => {
    const octubre = await createReservation(PERSONA_NORMAL, reserva(OCTUBRE_2026));

    const movida = await updateReservation(
      PERSONA_NORMAL,
      String(octubre._id),
      reserva({
        start: new Date('2026-11-05T15:00:00Z'),
        end: new Date('2026-11-08T15:00:00Z'),
      }),
      octubre
    );

    expect(movida?.amigosYear).toBe(2026);
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });
  });
});

/**
 * `motivo` es el nombre/motivo que puso el usuario ("MG", "Navidad", ...) y es
 * un campo distinto de `tipoInvitado`. El cupo se calcula SOLO con
 * `tipoInvitado`, y `motivo` no se lee ni se escribe nunca.
 */
describe('separación entre motivo (dato del usuario) y tipoInvitado (cupo)', () => {
  const RESERVA_MG = {
    _id: undefined as unknown as string,
    title: 'Octubre',
    booking: 'CT',
    motivo: 'MG',
    start: new Date('2026-10-22T15:00:00Z'),
    end: new Date('2026-10-25T15:00:00Z'),
  };

  it('el contenido de motivo no define el cupo: sin tipoInvitado no cuenta', async () => {
    seedReserva({ user: PERSONA_NORMAL, ...RESERVA_MG, tipoInvitado: undefined });
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 0 });
  });

  it('con tipoInvitado = Amigos cuenta, y motivo sigue siendo "MG"', async () => {
    const doc = seedReserva({
      user: PERSONA_NORMAL,
      ...RESERVA_MG,
      tipoInvitado: 'Amigos',
    });

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });
    expect(doc.motivo).toBe('MG');

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('motivo "Navidad" con tipoInvitado Familiar no consume cupo', async () => {
    seedReserva({
      user: PERSONA_NORMAL,
      motivo: 'Navidad',
      tipoInvitado: 'Familiar',
    });
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 0 });
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('crear una reserva nunca escribe motivo, aunque el cliente lo mande', async () => {
    const creada = await createReservation(PERSONA_NORMAL, {
      ...reserva(),
      motivo: 'inyectado por el cliente',
    });
    expect(creada.motivo).toBeUndefined();
  });

  it('editar una reserva NO pisa ni borra su motivo', async () => {
    const doc = seedReserva({
      user: PERSONA_NORMAL,
      ...RESERVA_MG,
      tipoInvitado: 'Amigos',
      amigosYear: 2026,
      amigosSlot: 1,
    });

    // Se edita el título y se cambia a Familiar: el motivo debe sobrevivir.
    await updateReservation(
      PERSONA_NORMAL,
      String(doc._id),
      {
        title: 'Octubre editado',
        booking: 'CT',
        tipoInvitado: 'Familiar',
        start: RESERVA_MG.start,
        end: RESERVA_MG.end,
      },
      doc as never
    );

    const guardada = FakeEventModel.store.find((d) => d._id === doc._id);
    expect(guardada?.motivo).toBe('MG');
    expect(guardada?.title).toBe('Octubre editado');
    expect(guardada?.tipoInvitado).toBe('Familiar');
    expect(guardada?.amigosSlot).toBeUndefined();
  });

  it('una marca administrativa (feriado) tampoco borra el motivo', async () => {
    // A futuro: convertirla en feriado libera su cupo, y eso exige las 24 h.
    const doc = seedReserva({
      user: GG,
      motivo: 'Feriado de carnaval',
      tipoInvitado: 'Amigos',
      booking: 'CT',
      start: enHoras(72),
      end: enHoras(96),
    });

    await updateReservation(
      GG,
      String(doc._id),
      { title: 'Carnaval', booking: 'FR', start: doc.start, end: doc.end },
      doc as never
    );

    const guardada = FakeEventModel.store.find((d) => d._id === doc._id);
    expect(guardada?.motivo).toBe('Feriado de carnaval');
    expect(guardada?.tipoInvitado).toBeUndefined();
  });
});

/**
 * Reservas históricas por encima del límite: se conservan tal cual, pero
 * bloquean cualquier reserva nueva de Amigos. El sistema no asume que una
 * persona pueda tener como mucho una reserva vieja.
 */
describe('usuarios por encima de su límite (reservas ya contabilizadas)', () => {
  it('un usuario normal con 3 reservas históricas: usadas = 3, límite = 1', async () => {
    for (let i = 0; i < 3; i += 1) seedReserva({ user: PERSONA_NORMAL });

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toEqual({
      year: 2026,
      limite: 1,
      usadas: 3,
      restantes: 0,
    });
  });

  it('conserva esas 3 reservas y no deja crear una nueva', async () => {
    for (let i = 0; i < 3; i += 1) seedReserva({ user: PERSONA_NORMAL });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    // Ninguna reserva se borró ni se modificó.
    expect(FakeEventModel.store).toHaveLength(3);
    expect(FakeEventModel.store.every((d) => d.tipoInvitado === 'Amigos')).toBe(true);
  });

  it('GG con 5 reservas históricas: usadas = 5, límite = 4, y no puede crear otra', async () => {
    for (let i = 0; i < 5; i += 1) seedReserva({ user: GG });

    expect(await getAmigosQuotaState(GG, 2026)).toEqual({
      year: 2026,
      limite: 4,
      usadas: 5,
      restantes: 0,
    });

    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(5);
  });

  it('el mensaje de error no se rompe cuando usadas supera al límite', async () => {
    for (let i = 0; i < 3; i += 1) seedReserva({ user: PERSONA_NORMAL });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toThrow(
      /Ya usaste tu cupo de reservas de Amigos para 2026 \(3 de 1\)/
    );
  });

  it('restantes nunca es negativo', async () => {
    for (let i = 0; i < 7; i += 1) seedReserva({ user: PERSONA_NORMAL });
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).restantes).toBe(0);
  });

  it('el usuario ilimitado nunca se bloquea, tenga las que tenga', async () => {
    for (let i = 0; i < 9; i += 1) seedReserva({ user: JUAN_PABLO });

    expect(await getAmigosQuotaState(JUAN_PABLO, 2026)).toMatchObject({
      limite: null,
      usadas: 9,
      restantes: null,
    });
    await expect(createReservation(JUAN_PABLO, reserva())).resolves.toBeTruthy();
  });

  it('las reservas por encima del límite de un año no afectan al año siguiente', async () => {
    for (let i = 0; i < 3; i += 1) seedReserva({ user: PERSONA_NORMAL });

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2027)).toMatchObject({
      usadas: 0,
      restantes: 1,
    });
  });
});

/**
 * La regla es "reservas de Amigos cuyo `start` cae en el año consultado",
 * sin nada especial para 2026: 2027 y siguientes funcionan igual.
 */
describe('el cupo es por año calendario, sin lógica atada a 2026', () => {
  const enAnio = (anio: number, mes = 5) => ({
    start: new Date(Date.UTC(anio, mes, 12, 15)),
    end: new Date(Date.UTC(anio, mes, 14, 15)),
  });

  it('el mismo escenario se repite igual en 2027, 2028 y 2029', async () => {
    for (const anio of [2027, 2028, 2029]) {
      FakeEventModel.reset();

      await createReservation(PERSONA_NORMAL, reserva(enAnio(anio)));
      expect(await getAmigosQuotaState(PERSONA_NORMAL, anio)).toMatchObject({
        limite: 1,
        usadas: 1,
        restantes: 0,
      });

      await expect(
        createReservation(PERSONA_NORMAL, reserva(enAnio(anio, 8)))
      ).rejects.toBeInstanceOf(AmigosQuotaExceededError);

      // El año siguiente arranca limpio.
      expect(await getAmigosQuotaState(PERSONA_NORMAL, anio + 1)).toMatchObject({
        usadas: 0,
        restantes: 1,
      });
    }
  });

  it('GG mantiene sus 4 cupos en cualquier año', async () => {
    for (let i = 0; i < 4; i += 1) await createReservation(GG, reserva(enAnio(2030, i)));

    expect(await getAmigosQuotaState(GG, 2030)).toMatchObject({ usadas: 4, restantes: 0 });
    await expect(createReservation(GG, reserva(enAnio(2030, 9)))).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    await expect(createReservation(GG, reserva(enAnio(2031)))).resolves.toBeTruthy();
  });
});

/**
 * MODELO DEFINITIVO
 *
 * El cupo se calcula exclusivamente como:
 *   reservas con tipoInvitado = "Amigos" cuyo `start` cae en el año consultado.
 *
 * Las reservas anteriores al sistema (sin `tipoInvitado`) quedan afuera: no
 * cuentan, no se modifican y no se clasifican. El contador arranca en 0.
 */
describe('modelo definitivo del cupo', () => {
  it('4. las reservas sin tipoInvitado no cuentan, sean como sean', async () => {
    // Todas del año en curso, con datos variados que NO deben influir.
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, motivo: 'MG' });
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, motivo: 'Navidad' });
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, booking: 'PR', pax: 12 });
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, notes: 'vinieron amigos' });

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toEqual({
      year: 2026,
      limite: 1,
      usadas: 0,
      restantes: 1,
    });
  });

  it('4b. con reservas viejas sin tipoInvitado, igual puede hacer su reserva de Amigos', async () => {
    for (let i = 0; i < 5; i += 1) {
      seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined });
    }

    const nueva = await createReservation(PERSONA_NORMAL, reserva());
    expect(nueva.tipoInvitado).toBe('Amigos');
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });

    // Y a partir de ahí sí se aplica el límite.
    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
  });

  it('4c. el sistema nunca escribe tipoInvitado en las reservas viejas', async () => {
    const viejas = [
      seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, motivo: 'MG' }),
      seedReserva({ user: PERSONA_NORMAL, tipoInvitado: undefined, motivo: 'Navidad' }),
    ];
    const antes = viejas.map((v) => JSON.stringify(v));

    await createReservation(PERSONA_NORMAL, reserva());

    for (const [i, vieja] of viejas.entries()) {
      const guardada = FakeEventModel.store.find((d) => d._id === vieja._id);
      expect(JSON.stringify(guardada)).toBe(antes[i]);
      expect(guardada?.tipoInvitado).toBeUndefined();
    }
  });

  it('1. las reservas nuevas guardan tipoInvitado correctamente', async () => {
    const amigos = await createReservation(PERSONA_NORMAL, reserva());
    const familiar = await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));

    expect(amigos.tipoInvitado).toBe('Amigos');
    expect(familiar.tipoInvitado).toBe('Familiar');
  });

  it('2. una reserva de Amigos futura del mismo año cuenta desde que se crea', async () => {
    await createReservation(
      PERSONA_NORMAL,
      reserva({
        start: new Date('2026-10-22T15:00:00Z'),
        end: new Date('2026-10-25T15:00:00Z'),
      })
    );

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 1,
      restantes: 0,
    });
    // 2027 arranca limpio.
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2027)).toMatchObject({ usadas: 0 });
  });

  it('3. Familiar es ilimitado y nunca consume cupo', async () => {
    for (let i = 0; i < 15; i += 1) {
      await createReservation(PERSONA_NORMAL, reserva({ tipoInvitado: 'Familiar' }));
    }

    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({
      usadas: 0,
      restantes: 1,
    });
    // Y el cupo de Amigos sigue intacto.
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('5. editar una reserva de Amigos no la cuenta contra sí misma al validar', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ start: enHoras(48), end: enHoras(96) })
    );

    // El uso real del año sigue siendo 1 (lo que muestra el aviso)...
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 1 });
    // ...pero al validar el guardado se excluye a sí misma.
    expect(
      await getAmigosQuotaState(PERSONA_NORMAL, 2026, String(creada._id))
    ).toMatchObject({ usadas: 0, restantes: 1 });

    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ title: 'Editada', pax: 9, start: enHoras(48), end: enHoras(96) }),
      creada
    );
    expect(editada?.title).toBe('Editada');
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 1 });
  });

  it('6. motivo es independiente: no se lee para el cupo ni se escribe nunca', async () => {
    // Una reserva Familiar con motivo "MG" no consume cupo...
    seedReserva({ user: PERSONA_NORMAL, tipoInvitado: 'Familiar', motivo: 'MG' });
    expect(await getAmigosQuotaState(PERSONA_NORMAL, 2026)).toMatchObject({ usadas: 0 });

    // ...y crear una reserva nunca escribe motivo, aunque el cliente lo mande.
    const creada = await createReservation(PERSONA_NORMAL, {
      ...reserva(),
      motivo: 'esto se descarta',
    });
    expect(creada.motivo).toBeUndefined();
  });

  it('los límites por persona son datos, no condiciones sobre el nombre', async () => {
    // Mismo escenario, tres personas, tres resultados según su configuración.
    await createReservation(PERSONA_NORMAL, reserva());
    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    for (let i = 0; i < 4; i += 1) await createReservation(GG, reserva());
    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    for (let i = 0; i < 8; i += 1) await createReservation(JUAN_PABLO, reserva());
    await expect(createReservation(JUAN_PABLO, reserva())).resolves.toBeTruthy();
  });
});
