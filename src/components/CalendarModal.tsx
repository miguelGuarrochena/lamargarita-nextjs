'use client';

import { useMemo, useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Select, NumberInput, Button, Group, Stack, Text, Box, Flex, Alert, Tooltip, ThemeIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useAuthStore, useCalendarStore, useUiStore } from '@/hooks';
import { reservas } from '@/lib/reservas';
import { specialEvents2026 } from '@/lib/specialDates2026';
import { AmigosQuota, Event, BookingType, TipoInvitado } from '@/types';
import {
  CANCELACION_ANTICIPACION_MINIMA_HORAS,
  TIPOS_INVITADO,
  TIPO_AMIGOS,
  bloqueaPorCupoAmigos,
  getReservaYear,
  isTipoInvitado,
  puedeCancelarse,
  requiereTipoInvitado,
} from '@/lib/amigosQuota';
import { useAmigosQuota } from '@/hooks/useAmigosQuota';
import { IconDeviceFloppy, IconEdit, IconX, IconConfetti, IconTrash, IconUsersGroup, IconAlertCircle } from '@tabler/icons-react';
import { confirmDeleteReservation } from '@/hooks/useCalendarActionButtons';
import { canManageEvent } from '@/lib/eventOwnership';
import { scheduleUiLockRelease } from '@/lib/releaseUiLocks';

const toDayValue = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

registerLocale('es', es);

const bookingColors: Record<string, string> = {
  'CT': '#e74c3c',
  'PA': '#edc308',
  'PR': '#086ded',
  'CS': '#808000',
  'FL': '#5dade2',
  'NC': '#d8ed08',
  'FR': '#e6e6e6',
  'VC': '#e67e22',
};

/**
 * Estado del cupo anual de Amigos: dice de entrada si la persona puede reservar
 * o no. El detalle numérico queda como información secundaria.
 *
 * Solo se renderiza cuando el tipo de invitado es Amigos; para Familiar no existe.
 */
const AmigosQuotaPanel = ({
  quota,
  editandoLaQueOcupa,
}: {
  quota: AmigosQuota;
  editandoLaQueOcupa: boolean;
}) => {
  const ilimitado = quota.limite === null;
  const sinCupo = !ilimitado && quota.restantes === 0;
  const tono = sinCupo ? 'orange' : 'teal';

  const plural = (n: number) => (n === 1 ? '' : 's');

  const titulo = ilimitado ? 'Cupo ilimitado' : sinCupo ? 'Sin cupo disponible' : 'Cupo disponible';

  let detalle: string;
  if (ilimitado) {
    detalle = 'Podés realizar reservas de Amigos sin límite.';
  } else if (!sinCupo) {
    detalle = `Tenés ${quota.restantes} reserva${plural(quota.restantes!)} de Amigos disponible${plural(
      quota.restantes!
    )} para ${quota.year}.`;
  } else if (quota.limite === 0) {
    detalle = 'No tenés habilitadas las reservas de Amigos.';
  } else {
    // Redacción única: también vale cuando `usadas` supera al límite por
    // reservas anteriores a esta restricción.
    detalle = `Ya usaste tu cupo de reservas de Amigos para ${quota.year}.`;
  }

  // Al editar la propia reserva que ocupa el cupo, el estado real es "sin
  // cupo", pero guardarla no está bloqueado: conviene decirlo.
  const aclaracion =
    sinCupo && editandoLaQueOcupa ? 'Estás editando esa misma reserva, podés guardarla.' : null;

  return (
    <Box
      p="sm"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        border: `1px solid var(--mantine-color-${tono}-2)`,
        backgroundColor: `var(--mantine-color-${tono}-0)`,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" color={tono} size={32} radius="md">
            {sinCupo ? <IconAlertCircle size={18} /> : <IconUsersGroup size={18} />}
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={600} lh={1.35}>
              {titulo}
            </Text>
            <Text size="xs" c="dimmed" lh={1.4}>
              {detalle}
            </Text>
            {aclaracion && (
              <Text size="xs" c="dimmed" fs="italic" lh={1.4} mt={2}>
                {aclaracion}
              </Text>
            )}
          </Box>
        </Group>

        {!ilimitado && quota.limite! > 0 && (
          <Text size="xs" c="dimmed" fw={500} mt={4} style={{ whiteSpace: 'nowrap' }}>
            {quota.usadas} / {quota.limite}
          </Text>
        )}
      </Group>
    </Box>
  );
};

export const CalendarModal = () => {
  const { isDateModalOpen, closeDateModal } = useUiStore();
  const { activeEvent, startSavingEvent, startDeletingEvent, setActiveEvent } = useCalendarStore();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [formValues, setFormValues] = useState({
    title: '',
    notes: '',
    start: new Date(),
    end: new Date(),
    booking: '',
    tipoInvitado: '',
    pax: '',
  });

  // Las marcas administrativas (feriado / vacaciones) no son reservas de una
  // persona: no piden tipo de invitado ni consumen cupo.
  const tipoInvitadoAplica = requiereTipoInvitado(formValues.booking);
  // Mismo criterio que el store y que el backend (`isTipoInvitado`). Si acá se
  // chequeara solo `=== ''`, un valor distinto de vacío pero inválido pasaría
  // esta guarda y recién fallaría más adelante, con el Select mostrando algo
  // elegido y un cartel pidiendo elegir el tipo de invitado.
  const tipoInvitadoFaltante = tipoInvitadoAplica && !isTipoInvitado(formValues.tipoInvitado);

  const reservaYear = useMemo(() => {
    try {
      return getReservaYear(formValues.start);
    } catch {
      return null;
    }
  }, [formValues.start]);

  // El cupo es un concepto exclusivo de Amigos: para Familiar no se consulta ni
  // se muestra nada, y no se aplica ningún límite.
  const esAmigos = tipoInvitadoAplica && formValues.tipoInvitado === TIPO_AMIGOS;

  // El aviso muestra el uso REAL del año: una reserva de Amigos que ya existe
  // cuenta siempre, incluso si es la que se está editando en este momento.
  const { quota } = useAmigosQuota(reservaYear, isDateModalOpen && esAmigos);

  // ...pero esa reserva no puede bloquearse a sí misma al guardar.
  const reservaEditadaConsumeCupo =
    !!activeEvent?.id &&
    activeEvent.tipoInvitado === TIPO_AMIGOS &&
    reservaYear !== null &&
    getReservaYear(activeEvent.start) === reservaYear;

  // Único estado de "no queda cupo": lo comparten el aviso y los dos botones
  // (mobile y desktop). Es solo UX; el backend sigue siendo la fuente de verdad.
  const sinCupoAmigos = bloqueaPorCupoAmigos({
    esAmigos,
    quota,
    reservaEditadaConsumeCupo,
  });

  const overlappingSpecials = useMemo(() => {
    const s = toDayValue(formValues.start);
    const e = toDayValue(formValues.end);
    return specialEvents2026.filter((h) => {
      const hs = toDayValue(new Date(h.start));
      const he = toDayValue(new Date(h.end));
      return s <= he && e >= hs;
    });
  }, [formValues.start, formValues.end]);

  useEffect(() => {
    if (activeEvent !== null) {
      setFormValues({
        title: activeEvent.title,
        notes: activeEvent.notes || '',
        start: new Date(activeEvent.start),
        end: new Date(activeEvent.end),
        booking: activeEvent.booking,
        tipoInvitado: activeEvent.tipoInvitado || '',
        pax: activeEvent.pax?.toString() || '',
      });
    }
  }, [activeEvent]);

  const onInputChanged = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { target } = event;
    setFormValues({
      ...formValues,
      [target.name]: target.value,
    });
  };

  const onDateChanged = (event: Date | null, changing: string) => {
    if (event) {
      setFormValues({
        ...formValues,
        [changing]: event,
      });
    }
  };

  const onCloseModal = () => {
    closeDateModal();
    setFormSubmitted(false);
    setActiveEvent(null);
  };

  const closeEditModalOnly = () => {
    closeDateModal();
    setFormSubmitted(false);
  };

  const canDelete = !!activeEvent?.id && canManageEvent(activeEvent, user);

  // La ventana de cancelación se mide sobre la reserva guardada, no sobre lo
  // que la persona esté tocando en el formulario.
  const cancelacionEnPlazo =
    !activeEvent ||
    !requiereTipoInvitado(activeEvent.booking) ||
    puedeCancelarse(activeEvent.start);

  const onDelete = async () => {
    const eventToDelete = activeEvent;
    if (!eventToDelete?.id || !cancelacionEnPlazo) return;

    closeEditModalOnly();
    const deleted = await confirmDeleteReservation(
      () => startDeletingEvent(eventToDelete),
      { afterCloseModal: true }
    );
    if (deleted) {
      setActiveEvent(null);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormSubmitted(true);

    if (formValues.title.length <= 0) return;
    if (tipoInvitadoFaltante) return;
    if (sinCupoAmigos) return;

    const eventToSave: Event = {
      ...formValues,
      booking: formValues.booking as BookingType,
      tipoInvitado: tipoInvitadoAplica ? (formValues.tipoInvitado as TipoInvitado) : undefined,
      // Dato del usuario: el formulario no lo edita y el servidor lo ignora.
      // Se arrastra solo para que el calendario lo siga mostrando sin recargar.
      motivo: activeEvent?.motivo,
      pax: parseInt(formValues.pax) || 0,
      id: activeEvent?.id,
    };

    await startSavingEvent(eventToSave);
    closeDateModal();
    setFormSubmitted(false);
    setActiveEvent(null);
  };

  const selectData = [
    { value: '', label: 'Seleccionar una opción' },
    ...reservas.map((r) => ({ value: r.id, label: r.name })),
    ...(user?.name === 'Juan Pablo' ? [{ value: 'NC', label: 'Reserva No Compartible' }] : []),
    ...(user?.name === 'Miguel' ? [
      { value: 'FR', label: 'Feriado' },
      { value: 'VC', label: 'Vacaciones' }
    ] : []),
  ];

  const selectedBookingColor = formValues.booking ? bookingColors[formValues.booking] : null;

  return (
    <Modal
      opened={isDateModalOpen}
      onClose={onCloseModal}
      title={
        <Text size="xl" fw={700}>
          {activeEvent?.id ? 'Editar Reserva' : 'Nueva Reserva'}
        </Text>
      }
      size="md"
      centered
      trapFocus
      lockScroll
      onExitTransitionEnd={scheduleUiLockRelease}
      styles={{
        content: {
          maxHeight: 'min(90dvh, 720px)',
        },
        body: {
          maxHeight: 'calc(min(90dvh, 720px) - 4.5rem)',
          overflowY: 'auto',
        },
      }}
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb={5}>Fecha de entrada</Text>
            <DatePicker
              selected={formValues.start}
              onChange={(event) => onDateChanged(event, 'start')}
              className="mantine-datepicker"
              locale="es"
              dateFormat="dd/MM/yyyy"
              minDate={new Date()}
              portalId="root-portal"
              popperPlacement="bottom-start"
              required
            />
          </div>

          <div>
            <Text size="sm" fw={500} mb={5}>Fecha de salida</Text>
            <DatePicker
              minDate={formValues.start}
              selected={formValues.end}
              onChange={(event) => onDateChanged(event, 'end')}
              className="mantine-datepicker"
              dateFormat="dd/MM/yyyy"
              locale="es"
              portalId="root-portal"
              popperPlacement="bottom-start"
              required
            />
          </div>

          {overlappingSpecials.length > 0 && (
            <Alert
              variant="light"
              color="orange"
              icon={<IconConfetti size={18} />}
              title="¡Ojo! Hay fechas especiales en este rango"
              radius="md"
            >
              <Stack gap={2}>
                {overlappingSpecials.map((h, i) => (
                  <Text size="sm" key={`${h.id}-${i}`}>
                    • {h.title}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          <TextInput
            label="Una descripción corta"
            name="title"
            value={formValues.title}
            onChange={onInputChanged}
            error={formSubmitted && formValues.title.length === 0 ? 'Este campo es requerido' : null}
            required
          />

          <Box>
            <Text size="sm" fw={500} mb={5}>Reserva</Text>
            <Select
              name="booking"
              value={formValues.booking}
              onChange={(value) => setFormValues({ ...formValues, booking: value || '' })}
              data={selectData}
              required
              placeholder="Seleccionar una opción"
              searchable={false}
              clearable={false}
              allowDeselect={false}
              comboboxProps={{
                zIndex: 2100,
                withinPortal: true,
                position: 'bottom-start',
                middlewares: {
                  flip: true,
                  shift: true,
                },
              }}
              leftSection={
                selectedBookingColor ? (
                  <Box
                    w={16}
                    h={16}
                    style={{
                      backgroundColor: selectedBookingColor,
                      borderRadius: '3px',
                    }}
                  />
                ) : null
              }
              renderOption={({ option }) => (
                <Flex align="center" gap="sm" style={{ padding: '8px 12px' }}>
                  {option.value && (
                    <Box
                      w={20}
                      h={20}
                      style={{
                        backgroundColor: bookingColors[option.value] || '#gray',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Text size="sm" c={!option.value ? 'dimmed' : undefined}>
                    {option.label}
                  </Text>
                </Flex>
              )}
            />
          </Box>

          {tipoInvitadoAplica && (
            <Box>
              <Text size="sm" fw={500} mb={5}>
                Tipo de invitado <Text span c="red">*</Text>
              </Text>
              <Select
                name="tipoInvitado"
                value={formValues.tipoInvitado}
                onChange={(value) => setFormValues({ ...formValues, tipoInvitado: value || '' })}
                data={TIPOS_INVITADO.map((m) => ({ value: m, label: m }))}
                placeholder="Seleccionar un tipo de invitado"
                searchable={false}
                clearable={false}
                allowDeselect={false}
                error={formSubmitted && tipoInvitadoFaltante ? 'Elegí el tipo de invitado' : null}
                comboboxProps={{
                  zIndex: 2100,
                  withinPortal: true,
                  position: 'bottom-start',
                  middlewares: { flip: true, shift: true },
                }}
              />
            </Box>
          )}

          {esAmigos && quota && (
            <AmigosQuotaPanel quota={quota} editandoLaQueOcupa={reservaEditadaConsumeCupo} />
          )}

          <NumberInput
            label="Cantidad Personas"
            name="pax"
            value={formValues.pax ? parseInt(formValues.pax) : undefined}
            onChange={(value) => setFormValues({ ...formValues, pax: value?.toString() || '' })}
            min={1}
            max={25}
          />

          <Textarea
            label="Notas"
            name="notes"
            value={formValues.notes}
            onChange={onInputChanged}
            placeholder="Notas adicionales..."
            rows={4}
          />

          {isMobile ? (
            <Stack gap="sm" mt="md">
              <Button
                type="submit"
                fullWidth
                leftSection={activeEvent?.id ? <IconEdit size={16} /> : <IconDeviceFloppy size={16} />}
                disabled={(formSubmitted && (formValues.title.length === 0 || tipoInvitadoFaltante)) || sinCupoAmigos}
              >
                {activeEvent?.id ? 'Modificar' : 'Guardar'}
              </Button>
              <Button
                fullWidth
                variant="outline"
                type="button"
                onClick={onCloseModal}
                leftSection={<IconX size={16} />}
              >
                Cancelar
              </Button>
              {canDelete && (
                <>
                  <Button
                    type="button"
                    fullWidth
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={16} />}
                    onClick={onDelete}
                    disabled={!cancelacionEnPlazo}
                  >
                    Eliminar reserva
                  </Button>
                  {!cancelacionEnPlazo && (
                    <Text size="xs" c="dimmed" ta="center">
                      Solo se puede cancelar con al menos{' '}
                      {CANCELACION_ANTICIPACION_MINIMA_HORAS} horas de anticipación.
                    </Text>
                  )}
                </>
              )}
            </Stack>
          ) : (
            <Group justify="space-between" mt="md" gap="sm">
              {canDelete ? (
                <Tooltip
                  label={`Solo se puede cancelar con al menos ${CANCELACION_ANTICIPACION_MINIMA_HORAS} horas de anticipación.`}
                  disabled={cancelacionEnPlazo}
                  withArrow
                  multiline
                  w={240}
                >
                  <Box>
                    <Button
                      type="button"
                      color="red"
                      variant="light"
                      leftSection={<IconTrash size={16} />}
                      onClick={onDelete}
                      disabled={!cancelacionEnPlazo}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </Tooltip>
              ) : <span />}
              <Group gap="sm">
                <Button
                  variant="outline"
                  type="button"
                  onClick={onCloseModal}
                  leftSection={<IconX size={16} />}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  leftSection={activeEvent?.id ? <IconEdit size={16} /> : <IconDeviceFloppy size={16} />}
                  disabled={(formSubmitted && (formValues.title.length === 0 || tipoInvitadoFaltante)) || sinCupoAmigos}
                >
                  {activeEvent?.id ? 'Modificar' : 'Guardar'}
                </Button>
              </Group>
            </Group>
          )}
        </Stack>
      </form>
    </Modal>
  );
};