'use client';

import { useMemo, useState, useEffect, forwardRef } from 'react';
import { Modal, TextInput, Textarea, Select, NumberInput, Button, Group, Stack, Text, Badge, Box, Flex } from '@mantine/core';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useAuthStore, useCalendarStore, useUiStore } from '@/hooks';
import { reservas } from '@/lib/reservas';
import { Event, BookingType } from '@/types';
import { IconDeviceFloppy, IconEdit, IconX } from '@tabler/icons-react';

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
  const { activeEvent, startSavingEvent } = useCalendarStore();
  const { user } = useAuthStore();
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [formValues, setFormValues] = useState({
    title: '',
    notes: '',
    start: new Date(),
    end: new Date(),
    booking: '',
    pax: '',
  });

  const titleClass = useMemo(() => {
    if (!formSubmitted) return '';
    return formValues.title.length > 0 ? '' : 'is-invalid';
  }, [formValues.title, formSubmitted]);

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
              data={selectData.map(item => ({
                ...item,
                color: item.value ? bookingColors[item.value] : undefined
              }))}
              required
              placeholder="Seleccionar una opción"
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

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={onCloseModal}
              leftSection={<IconX size={16} />}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              leftSection={activeEvent?.id ? <IconEdit size={16} /> : <IconDeviceFloppy size={16} />}
              color="blue"
              disabled={formSubmitted && formValues.title.length === 0}
            >
              {activeEvent?.id ? 'Modificar' : 'Guardar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
