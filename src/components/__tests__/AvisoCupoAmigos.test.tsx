// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AvisoCupoAmigos } from '@/components/AvisoCupoAmigos';
import { TIPO_AMIGOS, TIPO_FAMILIAR } from '@/lib/amigosQuota';

const renderAviso = (props: React.ComponentProps<typeof AvisoCupoAmigos>) =>
  render(
    <MantineProvider>
      <AvisoCupoAmigos {...props} />
    </MantineProvider>
  );

beforeAll(() => {
  // Mantine consulta media queries al montar; jsdom no las implementa.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe('<AvisoCupoAmigos />', () => {
  it('1. con "Amigos" se muestra el aviso dentro del formulario', () => {
    renderAviso({ tipoInvitado: TIPO_AMIGOS });

    expect(
      screen.getByText(/podés cancelar esta reserva hasta 24 horas antes/i)
    ).toBeDefined();
    expect(screen.getByText(/contará para tu cupo anual de Amigos/i)).toBeDefined();
  });

  it('2. con "Familiar" el aviso no aparece', () => {
    renderAviso({ tipoInvitado: TIPO_FAMILIAR });

    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByText(/cupo anual de Amigos/i)).toBeNull();
    expect(screen.queryByText(/24 horas/i)).toBeNull();
  });

  it('sin tipo de invitado elegido tampoco aparece', () => {
    renderAviso({ tipoInvitado: '' });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('cambiar de Amigos a Familiar hace desaparecer el aviso', () => {
    const { rerender } = render(
      <MantineProvider>
        <AvisoCupoAmigos tipoInvitado={TIPO_AMIGOS} />
      </MantineProvider>
    );
    expect(screen.queryByRole('note')).not.toBeNull();

    rerender(
      <MantineProvider>
        <AvisoCupoAmigos tipoInvitado={TIPO_FAMILIAR} />
      </MantineProvider>
    );
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('con la reserva fuera del plazo de cancelación muestra el texto adaptado', () => {
    renderAviso({ tipoInvitado: TIPO_AMIGOS, cancelacionEnPlazo: false });

    expect(
      screen.getByText(/contará para tu cupo anual de Amigos, ya que faltan menos de 24 horas/i)
    ).toBeDefined();
    expect(screen.queryByText(/podés cancelar esta reserva/i)).toBeNull();
  });
});
