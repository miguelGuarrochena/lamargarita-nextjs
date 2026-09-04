/**
 * Flujo de reservas de punta a punta contra un Mongo falso que replica el
 * índice único del cupo. Cubre los escenarios de la regla de negocio:
 * motivo obligatorio, límites por persona, cancelación, año calendario y
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
const { AmigosQuotaExceededError, CancelacionFueraDePlazoError, MotivoRequeridoError } =
  await import('@/lib/amigosQuota');

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
 * Inserta una reserva "histórica" directamente en la colección, como las que
 * ya existían antes de esta implementación: sin `amigosYear` ni `amigosSlot`.
 */
function seedReservaHistorica(fields: Record<string, unknown>) {
  const doc = {
    _id: oid(),
    title: 'Reserva histórica',
    booking: 'CT',
    motivo: 'Amigos',
    pax: 4,
    start: new Date('2026-04-10T15:00:00Z'),
    end: new Date('2026-04-12T15:00:00Z'),
    ...fields,
  };
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
    motivo: 'Amigos',
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

describe('motivo obligatorio', () => {
  it('no se puede crear una reserva sin motivo', async () => {
    await expect(
      createReservation(PERSONA_NORMAL, reserva({ motivo: undefined }))
    ).rejects.toBeInstanceOf(MotivoRequeridoError);
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('no se puede crear una reserva con un motivo inventado', async () => {
    await expect(
      createReservation(PERSONA_NORMAL, reserva({ motivo: 'Trabajo' }))
    ).rejects.toBeInstanceOf(MotivoRequeridoError);
  });

  it('tampoco se puede editar una reserva dejándola sin motivo', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva({ motivo: 'Familiar' }));
    await expect(
      updateReservation(
        PERSONA_NORMAL,
        String(creada._id),
        reserva({ motivo: undefined }),
        creada
      )
    ).rejects.toBeInstanceOf(MotivoRequeridoError);
  });

  it('los feriados/vacaciones administrativos no piden motivo', async () => {
    const feriado = await createReservation(GG, reserva({ booking: 'FR', motivo: undefined }));
    expect(feriado.motivo).toBeUndefined();
    expect(feriado.amigosSlot).toBeUndefined();
  });
});

describe('Familiar no consume el cupo de Amigos', () => {
  it('permite muchas reservas Familiar aunque el límite de Amigos sea 1', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createReservation(PERSONA_NORMAL, reserva({ motivo: 'Familiar' }));
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
      createReservation(SIN_AMIGOS, reserva({ motivo: 'Familiar' }))
    ).resolves.toBeTruthy();
  });
});

describe('límite anual por persona', () => {
  it('una persona sin configurar puede hacer 1 reserva de Amigos', async () => {
    const creada = await createReservation(PERSONA_NORMAL, reserva());
    expect(creada.motivo).toBe('Amigos');
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
      reserva({ motivo: 'Familiar' }),
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
    const familiar = await createReservation(PERSONA_NORMAL, reserva({ motivo: 'Familiar' }));

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

describe('reservas de Amigos preexistentes', () => {
  it('una reserva vieja sin cupo asignado igual consume el límite', () => {
    seedReservaHistorica({ user: PERSONA_NORMAL });

    return expect(getAmigosQuotaState(PERSONA_NORMAL, 2026)).resolves.toMatchObject({
      limite: 1,
      usadas: 1,
      restantes: 0,
    });
  });

  it('una persona normal con 1 reserva de Amigos preexistente no puede hacer otra', async () => {
    seedReservaHistorica({ user: PERSONA_NORMAL });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(1);
  });

  it('GG con 2 preexistentes puede hacer 2 más, pero no una quinta', async () => {
    seedReservaHistorica({ user: GG });
    seedReservaHistorica({ user: GG });

    expect((await getAmigosQuotaState(GG, 2026)).restantes).toBe(2);

    await createReservation(GG, reserva());
    await createReservation(GG, reserva());

    await expect(createReservation(GG, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );
    expect(FakeEventModel.store).toHaveLength(4);
  });

  it('Juan Pablo sigue reservando aunque tenga preexistentes', async () => {
    seedReservaHistorica({ user: JUAN_PABLO });
    seedReservaHistorica({ user: JUAN_PABLO });

    await expect(createReservation(JUAN_PABLO, reserva())).resolves.toBeTruthy();
    expect((await getAmigosQuotaState(JUAN_PABLO, 2026)).usadas).toBe(3);
  });

  it('una reserva preexistente Familiar no consume el límite de Amigos', async () => {
    seedReservaHistorica({ user: PERSONA_NORMAL, motivo: 'Familiar' });

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('una reserva preexistente de otro año no consume el cupo del año actual', async () => {
    seedReservaHistorica({
      user: PERSONA_NORMAL,
      start: new Date('2025-04-10T15:00:00Z'),
      end: new Date('2025-04-12T15:00:00Z'),
    });

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2025)).usadas).toBe(1);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('no modifica ni borra las reservas históricas al crear una nueva', async () => {
    const historica = seedReservaHistorica({ user: GG });
    const snapshot = JSON.stringify(historica);

    await createReservation(GG, reserva());

    const guardada = FakeEventModel.store.find((d) => d._id === historica._id);
    expect(guardada).toBeDefined();
    expect(JSON.stringify(guardada)).toBe(snapshot);
    expect(guardada?.amigosSlot).toBeUndefined();
  });

  it('la nueva reserva no pisa el cupo de una preexistente que sí tenía slot', async () => {
    seedReservaHistorica({ user: GG, amigosYear: 2026, amigosSlot: 1 });

    const nueva = await createReservation(GG, reserva());
    expect(nueva.amigosSlot).toBe(2);
  });

  it('cancelar una preexistente libera el cupo', async () => {
    const historica = seedReservaHistorica({ user: PERSONA_NORMAL, start: enHoras(72) });

    await expect(createReservation(PERSONA_NORMAL, reserva())).rejects.toBeInstanceOf(
      AmigosQuotaExceededError
    );

    await cancelReservation(String(historica._id), historica as never);

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
    await expect(createReservation(PERSONA_NORMAL, reserva())).resolves.toBeTruthy();
  });

  it('las preexistentes también cuentan frente a solicitudes concurrentes', async () => {
    seedReservaHistorica({ user: GG });
    seedReservaHistorica({ user: GG });
    seedReservaHistorica({ user: GG });

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
      reserva({ booking: 'FR', motivo: undefined, start: enHoras(-100), end: enHoras(-90) })
    );

    await expect(cancelReservation(String(feriado._id), feriado as never)).resolves.toBeUndefined();
    expect(FakeEventModel.store).toHaveLength(0);
  });

  it('una reserva Familiar también respeta la ventana de 24 h', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ motivo: 'Familiar', start: enHoras(3), end: enHoras(30) })
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
        reserva({ motivo: 'Familiar', start: enHoras(5), end: enHoras(30) }),
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
      reserva({ motivo: 'Familiar', start: enHoras(48), end: enHoras(72) }),
      creada
    );

    expect((await getAmigosQuotaState(PERSONA_NORMAL, 2026)).usadas).toBe(0);
  });

  it('editar una reserva Familiar dentro de las 24 h no toca la regla', async () => {
    const creada = await createReservation(
      PERSONA_NORMAL,
      reserva({ motivo: 'Familiar', start: enHoras(3), end: enHoras(30) })
    );

    const editada = await updateReservation(
      PERSONA_NORMAL,
      String(creada._id),
      reserva({ motivo: 'Familiar', title: 'Otro título', start: enHoras(3), end: enHoras(30) }),
      creada
    );

    expect(editada?.title).toBe('Otro título');
  });
});
