import { describe, expect, it } from 'vitest';
import {
  AVISO_AMIGOS_CANCELABLE,
  AVISO_AMIGOS_YA_CUENTA,
  CANCELACION_ANTICIPACION_MINIMA_HORAS,
  TIPO_AMIGOS,
  TIPO_FAMILIAR,
  assertPuedeCancelar,
  avisoCupoAmigos,
  bloqueaPorCupoAmigos,
  consumesAmigosQuota,
  puedeCancelarse,
} from '@/lib/amigosQuota';

const HORA = 60 * 60 * 1000;
const ahora = new Date('2026-05-10T12:00:00Z');
const enHoras = (h: number) => new Date(ahora.getTime() + h * HORA);

describe('aviso informativo del cupo de Amigos', () => {
  it('1. eligiendo "Amigos" aparece el aviso', () => {
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS })).toBe(AVISO_AMIGOS_CANCELABLE);
    expect(AVISO_AMIGOS_CANCELABLE).toContain(`${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas antes`);
    expect(AVISO_AMIGOS_CANCELABLE).toContain('cupo anual de Amigos');
  });

  it('2. eligiendo "Familiar" no aparece ningún aviso', () => {
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_FAMILIAR })).toBeNull();
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_FAMILIAR, cancelacionEnPlazo: false })).toBeNull();
  });

  it('sin elegir tipo de invitado (o con un valor inválido) tampoco aparece', () => {
    expect(avisoCupoAmigos({})).toBeNull();
    expect(avisoCupoAmigos({ tipoInvitado: '' })).toBeNull();
    expect(avisoCupoAmigos({ tipoInvitado: 'amigos' })).toBeNull();
    expect(avisoCupoAmigos({ tipoInvitado: undefined })).toBeNull();
  });

  it('con la reserva ya fuera del plazo de cancelación el texto se adapta', () => {
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo: false })).toBe(
      AVISO_AMIGOS_YA_CUENTA
    );
    expect(AVISO_AMIGOS_YA_CUENTA).toContain(
      `menos de ${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas`
    );
  });

  it('si el plazo no se conoce con certeza queda el aviso general', () => {
    // `undefined` es lo que llega para una reserva nueva, cuya fecha todavía se
    // puede cambiar en el formulario.
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo: undefined })).toBe(
      AVISO_AMIGOS_CANCELABLE
    );
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo: true })).toBe(
      AVISO_AMIGOS_CANCELABLE
    );
  });
});

describe('3. el aviso no interfiere con la validación del cupo', () => {
  const sinCupo = { limite: 1, restantes: 0 };
  const conCupo = { limite: 1, restantes: 1 };

  it('el bloqueo por cupo depende solo del cupo, no del aviso mostrado', () => {
    // Mismo caso "Amigos", con y sin aviso adaptado: el bloqueo no cambia.
    for (const cancelacionEnPlazo of [true, false, undefined]) {
      expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo })).not.toBeNull();

      expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: sinCupo })).toBe(true);
      expect(bloqueaPorCupoAmigos({ esAmigos: true, quota: conCupo })).toBe(false);
    }
  });

  it('con Familiar no hay aviso y tampoco hay bloqueo por cupo', () => {
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_FAMILIAR })).toBeNull();
    expect(bloqueaPorCupoAmigos({ esAmigos: false, quota: sinCupo })).toBe(false);
  });

  it('el aviso no cambia qué reservas consumen cupo', () => {
    expect(consumesAmigosQuota({ booking: 'CT', tipoInvitado: TIPO_AMIGOS })).toBe(true);
    expect(consumesAmigosQuota({ booking: 'CT', tipoInvitado: TIPO_FAMILIAR })).toBe(false);
    // Marcas administrativas: ni aviso ni cupo.
    expect(consumesAmigosQuota({ booking: 'VC', tipoInvitado: TIPO_AMIGOS })).toBe(false);
  });
});

describe('4. la lógica de cancelación sigue intacta', () => {
  it('la ventana de 24 horas no se movió', () => {
    expect(CANCELACION_ANTICIPACION_MINIMA_HORAS).toBe(24);
    expect(puedeCancelarse(enHoras(25), ahora)).toBe(true);
    expect(puedeCancelarse(enHoras(24), ahora)).toBe(true);
    expect(puedeCancelarse(enHoras(23), ahora)).toBe(false);
    expect(puedeCancelarse(enHoras(-1), ahora)).toBe(false);
  });

  it('el aviso no habilita ni bloquea la cancelación', () => {
    // Aunque el aviso diga "ya cuenta", la regla sigue rechazando la cancelación.
    expect(avisoCupoAmigos({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo: false })).toBe(
      AVISO_AMIGOS_YA_CUENTA
    );
    expect(() =>
      assertPuedeCancelar({ start: enHoras(23), booking: 'CT', now: ahora })
    ).toThrowError(/no se puede cancelar|ya no se puede cancelar/);

    expect(() =>
      assertPuedeCancelar({ start: enHoras(25), booking: 'CT', now: ahora })
    ).not.toThrow();
  });
});
