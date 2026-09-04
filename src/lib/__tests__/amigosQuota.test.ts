import { describe, expect, it } from 'vitest';
import {
  AmigosQuotaExceededError,
  bloqueaPorCupoAmigos,
  CANCELACION_ANTICIPACION_MINIMA_HORAS,
  CancelacionFueraDePlazoError,
  assertPuedeCancelar,
  horasHastaInicio,
  puedeCancelarse,
  DEFAULT_LIMITE_AMIGOS_ANUAL,
  TIPO_AMIGOS,
  TIPO_FAMILIAR,
  TipoInvitadoRequeridoError,
  consumesAmigosQuota,
  getReservaYear,
  isTipoInvitado,
  nextFreeSlot,
  parseTipoInvitado,
  requiereTipoInvitado,
  resolveLimiteAmigos,
  saveWithAmigosSlot,
} from '@/lib/amigosQuota';

describe('tipoInvitado', () => {
  it('solo acepta Familiar o Amigos', () => {
    expect(isTipoInvitado('Familiar')).toBe(true);
    expect(isTipoInvitado('Amigos')).toBe(true);
    expect(isTipoInvitado('amigos')).toBe(false);
    expect(isTipoInvitado('')).toBe(false);
    expect(isTipoInvitado(undefined)).toBe(false);
  });

  it('es obligatorio en las reservas de personas', () => {
    expect(() => parseTipoInvitado({ booking: 'CT' })).toThrow(TipoInvitadoRequeridoError);
    expect(() => parseTipoInvitado({ booking: 'CT', tipoInvitado: '' })).toThrow(TipoInvitadoRequeridoError);
    expect(() => parseTipoInvitado({ booking: 'CT', tipoInvitado: 'Trabajo' })).toThrow(TipoInvitadoRequeridoError);
    expect(parseTipoInvitado({ booking: 'CT', tipoInvitado: TIPO_FAMILIAR })).toBe(TIPO_FAMILIAR);
  });

  it('no aplica a las marcas administrativas del calendario (feriado/vacaciones)', () => {
    expect(requiereTipoInvitado('FR')).toBe(false);
    expect(requiereTipoInvitado('VC')).toBe(false);
    expect(requiereTipoInvitado('CT')).toBe(true);
    expect(parseTipoInvitado({ booking: 'FR' })).toBeUndefined();
  });

  it('solo Amigos consume cupo', () => {
    expect(consumesAmigosQuota({ booking: 'CT', tipoInvitado: TIPO_AMIGOS })).toBe(true);
    expect(consumesAmigosQuota({ booking: 'CT', tipoInvitado: TIPO_FAMILIAR })).toBe(false);
    expect(consumesAmigosQuota({ booking: 'VC', tipoInvitado: TIPO_AMIGOS })).toBe(false);
  });
});

describe('resolveLimiteAmigos', () => {
  it('usa el default cuando la persona no tiene configuración', () => {
    expect(resolveLimiteAmigos(undefined)).toBe(DEFAULT_LIMITE_AMIGOS_ANUAL);
    expect(DEFAULT_LIMITE_AMIGOS_ANUAL).toBe(1);
  });

  it('null es sin límite y 0 es prohibido', () => {
    expect(resolveLimiteAmigos(null)).toBeNull();
    expect(resolveLimiteAmigos(0)).toBe(0);
    expect(resolveLimiteAmigos(4)).toBe(4);
  });

  it('cae al default ante valores basura', () => {
    expect(resolveLimiteAmigos(-3)).toBe(DEFAULT_LIMITE_AMIGOS_ANUAL);
    expect(resolveLimiteAmigos(Number.NaN)).toBe(DEFAULT_LIMITE_AMIGOS_ANUAL);
  });
});

describe('getReservaYear', () => {
  it('usa el año calendario, no una ventana de 365 días', () => {
    expect(getReservaYear(new Date('2026-03-15T12:00:00Z'))).toBe(2026);
    expect(getReservaYear(new Date('2027-01-02T12:00:00Z'))).toBe(2027);
  });

  it('resuelve el fin de año en horario de Argentina, no en UTC', () => {
    // 31/12/2026 22:00 en Argentina ya es 01/01/2027 en UTC.
    expect(getReservaYear(new Date('2027-01-01T01:00:00Z'))).toBe(2026);
  });
});

describe('nextFreeSlot', () => {
  it('toma el menor cupo libre y reutiliza los huecos que dejan las cancelaciones', () => {
    expect(nextFreeSlot([])).toBe(1);
    expect(nextFreeSlot([1, 2])).toBe(3);
    expect(nextFreeSlot([2, 3])).toBe(1);
  });
});

describe('saveWithAmigosSlot', () => {
  const noConflict = () => false;

  it('rechaza cuando el cupo está agotado', async () => {
    await expect(
      saveWithAmigosSlot({
        limite: 1,
        year: 2026,
        readUsage: async () => ({ usadas: 1, occupiedSlots: [1] }),
        save: async () => 'guardado',
        isSlotConflict: noConflict,
      })
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('rechaza siempre cuando el límite es 0', async () => {
    await expect(
      saveWithAmigosSlot({
        limite: 0,
        year: 2026,
        readUsage: async () => ({ usadas: 0, occupiedSlots: [] }),
        save: async () => 'guardado',
        isSlotConflict: noConflict,
      })
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('nunca rechaza cuando el límite es null (sin límite)', async () => {
    const saved = await saveWithAmigosSlot({
      limite: null,
      year: 2026,
      readUsage: async () => ({ usadas: 5, occupiedSlots: [1, 2, 3, 4, 5] }),
      save: async (slot) => slot,
      isSlotConflict: noConflict,
    });
    expect(saved).toBe(6);
  });

  it('reintenta cuando el índice único rechaza el cupo elegido', async () => {
    let occupied: number[] = [];
    let intentos = 0;

    const saved = await saveWithAmigosSlot({
      limite: 4,
      year: 2026,
      readUsage: async () => ({ usadas: occupied.length, occupiedSlots: occupied }),
      isSlotConflict: (e) => (e as { code?: number }).code === 11000,
      save: async (slot) => {
        intentos += 1;
        if (intentos === 1) {
          // Otra request se quedó con el cupo 1 en el medio.
          occupied = [1];
          throw Object.assign(new Error('E11000'), { code: 11000 });
        }
        return slot;
      },
    });

    expect(saved).toBe(2);
    expect(intentos).toBe(2);
  });

  it('cuenta las reservas sin cupo asignado (previas a esta implementación)', async () => {
    // Una reserva de Amigos vieja: cuenta como usada aunque no tenga slot.
    await expect(
      saveWithAmigosSlot({
        limite: 1,
        year: 2026,
        readUsage: async () => ({ usadas: 1, occupiedSlots: [] }),
        save: async () => 'guardado',
        isSlotConflict: noConflict,
      })
    ).rejects.toBeInstanceOf(AmigosQuotaExceededError);
  });

  it('asigna el primer cupo libre aunque haya reservas viejas sin cupo', async () => {
    const slot = await saveWithAmigosSlot({
      limite: 4,
      year: 2026,
      readUsage: async () => ({ usadas: 2, occupiedSlots: [1] }),
      save: async (s) => s,
      isSlotConflict: noConflict,
    });
    expect(slot).toBe(2);
  });

  it('propaga los errores que no son de cupo duplicado', async () => {
    await expect(
      saveWithAmigosSlot({
        limite: 1,
        year: 2026,
        readUsage: async () => ({ usadas: 0, occupiedSlots: [] }),
        isSlotConflict: noConflict,
        save: async () => {
          throw new Error('la base se cayó');
        },
      })
    ).rejects.toThrow('la base se cayó');
  });
});

describe('ventana de cancelación', () => {
  const AHORA = new Date('2026-09-04T12:00:00Z');
  const enHoras = (h: number) => new Date(AHORA.getTime() + h * 60 * 60 * 1000);

  it('la anticipación mínima es de 24 horas', () => {
    expect(CANCELACION_ANTICIPACION_MINIMA_HORAS).toBe(24);
  });

  it('permite cancelar con 24 horas o más de anticipación', () => {
    expect(puedeCancelarse(enHoras(24), AHORA)).toBe(true);
    expect(puedeCancelarse(enHoras(48), AHORA)).toBe(true);
  });

  it('rechaza cuando faltan menos de 24 horas', () => {
    expect(puedeCancelarse(enHoras(23.9), AHORA)).toBe(false);
    expect(puedeCancelarse(enHoras(1), AHORA)).toBe(false);
  });

  it('rechaza reservas que ya empezaron o pasaron, sin excepciones', () => {
    expect(puedeCancelarse(enHoras(0), AHORA)).toBe(false);
    expect(puedeCancelarse(enHoras(-5), AHORA)).toBe(false);
    expect(puedeCancelarse(enHoras(-24 * 30), AHORA)).toBe(false);
  });

  it('horasHastaInicio es negativo para reservas pasadas', () => {
    expect(horasHastaInicio(enHoras(-3), AHORA)).toBeCloseTo(-3);
    expect(horasHastaInicio(enHoras(10), AHORA)).toBeCloseTo(10);
  });

  it('assertPuedeCancelar lanza el error tipado dentro de las 24 h', () => {
    expect(() => assertPuedeCancelar({ start: enHoras(5), booking: 'CT', now: AHORA })).toThrow(
      CancelacionFueraDePlazoError
    );
    expect(() =>
      assertPuedeCancelar({ start: enHoras(30), booking: 'CT', now: AHORA })
    ).not.toThrow();
  });

  it('los feriados/vacaciones administrativos quedan fuera de la regla', () => {
    expect(() =>
      assertPuedeCancelar({ start: enHoras(-100), booking: 'FR', now: AHORA })
    ).not.toThrow();
    expect(() =>
      assertPuedeCancelar({ start: enHoras(1), booking: 'VC', now: AHORA })
    ).not.toThrow();
  });
});

/**
 * Estado del botón Crear/Reservar. Es el mismo predicado que usan el aviso y
 * los dos botones del formulario (mobile y desktop): no hay lógica duplicada.
 */
describe('bloqueaPorCupoAmigos (estado del botón Crear/Reservar)', () => {
  const conCupo = { limite: 1, restantes: 1 };
  const sinCupo = { limite: 1, restantes: 0 };
  const ggSinCupo = { limite: 4, restantes: 0 };
  const ilimitado = { limite: null, restantes: null };

  it('12. sin cupo de Amigos -> bloquea', () => {
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: sinCupo })).toBe(true);
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: ggSinCupo })).toBe(true);
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: { limite: 0, restantes: 0 } })).toBe(true);
  });

  it('con cupo disponible -> no bloquea', () => {
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: conCupo })).toBe(false);
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: { limite: 4, restantes: 1 } })).toBe(false);
  });

  it('13. con Familiar nunca bloquea, ni siquiera sin cupo de Amigos', () => {
    expect(bloqueaPorCupoAmigos({ esAmigos: false, quota: sinCupo })).toBe(false);
    expect(bloqueaPorCupoAmigos({ esAmigos: false, quota: ggSinCupo })).toBe(false);
    expect(bloqueaPorCupoAmigos({ esAmigos: false, quota: null })).toBe(false);
  });

  it('un usuario ilimitado nunca se bloquea', () => {
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: ilimitado })).toBe(false);
  });

  it('editar la reserva que ocupa el cupo no se bloquea a sí misma', () => {
    expect(
      bloqueaPorCupoAmigos({ esAmigos: true, quota: sinCupo, reservaEditadaConsumeCupo: true })
    ).toBe(false);
    // Pero una reserva NUEVA sí se bloquea con el mismo cupo agotado.
    expect(
      bloqueaPorCupoAmigos({ esAmigos: true, quota: sinCupo, reservaEditadaConsumeCupo: false })
    ).toBe(true);
  });

  it('sin datos del cupo todavía no bloquea (el backend valida igual)', () => {
    expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: null })).toBe(false);
  });
});
