'use client';

import { useMemo, useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Select, NumberInput, Button, Group, Stack, Text, Box, Flex, Alert, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useAuthStore, useCalendarStore, useUiStore } from '@/hooks';
import { reservas } from '@/lib/reservas';
import { specialEvents2026 } from '@/lib/specialDates2026';
import { Event, BookingType, Motivo } from '@/types';
import {
  CANCELACION_ANTICIPACION_MINIMA_HORAS,
  MOTIVOS,
  MOTIVO_AMIGOS,
  getReservaYear,
  puedeCancelarse,
  requiresMotivo,
} from '@/lib/amigosQuota';
import { useAmigosQuota } from '@/hooks/useAmigosQuota';
import { IconDeviceFloppy, IconEdit, IconX, IconConfetti, IconTrash, IconUsersGroup } from '@tabler/icons-react';
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
    motivo: '',
    pax: '',
  });

  // Las marcas administrativas (feriado / vacaciones) no son reservas de una
  // persona: no piden motivo ni consumen cupo.
  const motivoAplica = requiresMotivo(formValues.booking);
  const motivoFaltante = motivoAplica && formValues.motivo === '';

  const reservaYear = useMemo(() => {
    try {
      return getReservaYear(formValues.start);
    } catch {
      return null;
    }
  }, [formValues.start]);

  const { quota } = useAmigosQuota(reservaYear, isDateModalOpen && motivoAplica);

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
        motivo: activeEvent.motivo || '',
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
    !requiresMotivo(activeEvent.booking) ||
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
    if (motivoFaltante) return;

    const eventToSave: Event = {
      ...formValues,
      booking: formValues.booking as BookingType,
      motivo: motivoAplica ? (formValues.motivo as Motivo) : undefined,
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

          {motivoAplica && (
            <Box>
              <Text size="sm" fw={500} mb={5}>
                Motivo <Text span c="red">*</Text>
              </Text>
              <Select
                name="motivo"
                value={formValues.motivo}
                onChange={(value) => setFormValues({ ...formValues, motivo: value || '' })}
                data={MOTIVOS.map((m) => ({ value: m, label: m }))}
                placeholder="Seleccionar un motivo"
                searchable={false}
                clearable={false}
                allowDeselect={false}
                error={formSubmitted && motivoFaltante ? 'Elegí un motivo para la reserva' : null}
                comboboxProps={{
                  zIndex: 2100,
                  withinPortal: true,
                  position: 'bottom-start',
                  middlewares: { flip: true, shift: true },
                }}
              />
            </Box>
          )}

          {motivoAplica && formValues.motivo === MOTIVO_AMIGOS && quota && (
            <Alert
              variant="light"
              color={quota.restantes === 0 ? 'red' : 'blue'}
              icon={<IconUsersGroup size={18} />}
              radius="md"
            >
              <Text size="sm">
                {quota.limite === null
                  ? `No tenés límite de reservas con motivo Amigos. Llevás ${quota.usadas} en ${quota.year}.`
                  : quota.limite === 0
                  ? 'No tenés habilitadas reservas con motivo Amigos.'
                  : `Reservas Amigos ${quota.year}: ${quota.usadas} de ${quota.limite} usada${quota.usadas === 1 ? '' : 's'}.` +
                    (quota.restantes === 0
                      ? ' Ya no te queda cupo; cancelá una reserva para liberarlo.'
                      : ` Te queda${quota.restantes === 1 ? '' : 'n'} ${quota.restantes}.`)}
              </Text>
            </Alert>
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
                disabled={formSubmitted && (formValues.title.length === 0 || motivoFaltante)}
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
                  disabled={formSubmitted && (formValues.title.length === 0 || motivoFaltante)}
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