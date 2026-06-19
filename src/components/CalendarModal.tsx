'use client';

import { useMemo, useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Select, NumberInput, Button, Stack, Text, Box, Flex, Alert, Divider } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useAuthStore, useCalendarStore, useUiStore } from '@/hooks';
import { reservas } from '@/lib/reservas';
import { specialEvents2026 } from '@/lib/specialDates2026';
import { Event, BookingType } from '@/types';
import { IconDeviceFloppy, IconEdit, IconX, IconConfetti, IconTrash } from '@tabler/icons-react';
import { confirmDeleteReservation } from '@/hooks/useCalendarActionButtons';
import { canManageEvent } from '@/lib/eventOwnership';
import { scheduleUiLockRelease } from '@/lib/releaseUiLocks';

const toDayValue = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

registerLocale('es', es);

// Color mapping for booking types based on existing CSS styles
const bookingColors: Record<string, string> = {
  'CT': '#e74c3c', // total - red
  'PA': '#edc308', // parcial - yellow
  'PR': '#086ded', // principal - blue
  'CS': '#808000', // casita - olive
  'FL': '#5dade2', // finde-libre - light blue
  'NC': '#d8ed08', // no-compartible - lime
  'FR': '#e6e6e6', // feriado - gray
  'VC': '#e67e22', // vacaciones - orange
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
    pax: '',
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

  const onDelete = async () => {
    closeEditModalOnly();
    const deleted = await confirmDeleteReservation(startDeletingEvent, {
      afterCloseModal: true,
    });
    if (deleted) {
      setActiveEvent(null);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormSubmitted(true);

    if (formValues.title.length <= 0) return;

    const eventToSave: Event = {
      ...formValues,
      booking: formValues.booking as BookingType,
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

  // Get selected booking color for display
  const selectedBookingColor = formValues.booking ? bookingColors[formValues.booking] : null;

  const dangerZone = canDelete ? (
    <Box className="lm-danger-zone" mt="md">
      <Divider mb="md" />
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6} style={{ letterSpacing: '0.06em' }}>
        Zona de peligro
      </Text>
      <Text size="sm" c="dimmed" mb="sm">
        Esta acción elimina la reserva de forma permanente.
      </Text>
      <Button
        type="button"
        fullWidth
        color="red"
        variant="light"
        leftSection={<IconTrash size={16} />}
        onClick={onDelete}
      >
        Eliminar reserva
      </Button>
    </Box>
  ) : null;

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
      fullScreen={isMobile}
      centered={!isMobile}
      zIndex={2000}
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      withCloseButton
      closeOnClickOutside
      closeOnEscape
      trapFocus
      lockScroll
      onExitTransitionEnd={scheduleUiLockRelease}
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '90dvh',
        },
        body: {
          padding: 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <form onSubmit={onSubmit} className="lm-modal-form">
        <Box className="lm-modal-form__scroll">
          <Stack gap="md" p="md" pb="calc(env(safe-area-inset-bottom, 0px) + 1.5rem)">
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
              renderOption={({ option, checked }) => (
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
                  <Text size="sm" c={!option.value ? "dimmed" : undefined}>
                    {option.label}
                  </Text>
                </Flex>
              )}
            />
          </Box>

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

          <Stack gap="sm" mt="md" className="lm-modal-actions">
            <Button
              type="submit"
              fullWidth
              leftSection={activeEvent?.id ? <IconEdit size={16} /> : <IconDeviceFloppy size={16} />}
              disabled={formSubmitted && formValues.title.length === 0}
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
          </Stack>

          {dangerZone}
          </Stack>
        </Box>
      </form>
    </Modal>
  );
};
