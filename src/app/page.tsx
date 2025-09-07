'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks';
import { Navbar } from '@/components';
import { 
  Container, 
  Title, 
  Text, 
  List, 
  Button, 
  Group, 
  Stack, 
  Paper, 
  Loader, 
  Center, 
  AppShell,
  Badge,
  ThemeIcon
} from '@mantine/core';
import { 
  IconCalendar, 
  IconUser,
  IconSettings,
  IconEdit,
  IconMessage,
  IconPawOff,
  IconHome,
  IconTrash,
  IconAlertTriangle
} from '@tabler/icons-react';

export default function HomePage() {
  const { status, user, checkAuthToken } = useAuthStore();
  const router = useRouter();

  const memoizedCheckAuthToken = useCallback(() => {
    checkAuthToken();
  }, [checkAuthToken]);

  useEffect(() => {
    memoizedCheckAuthToken();
  }, [memoizedCheckAuthToken]);

  useEffect(() => {
    if (status === 'not-authenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'checking') {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (status === 'not-authenticated') {
    return null;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <Navbar />
      
      <AppShell.Main>
        <Container size="lg" py="xl">
        <Title order={1} ta="center" mb="md">Bienvenidos a La Margarita Reservas</Title>
        <Title order={3} ta="center" c="red" mb="sm">Algunas cosas a tener en cuenta...</Title>
        <Text ta="center" c="red" mb="xl" size="lg">
          Estas son las reglas para utilizar la Margarita, ayudando a dar un
          marco claro para que todos podamos disfrutar del campo y este sea un
          lugar de encuentro para la familia y amigos.
        </Text>

        <Paper withBorder p="md" mt="xl" style={{ width: "100%" }}  radius="lg"  >
          <Title order={3} ta="center" mb="md" c="red">Espacios Exclusivos para la familia</Title>
          <List spacing="xs">
            <List.Item>
              Vacaciones de Verano (a partir del 20 de Diciembre aprox hasta 1er
              fin de Semana de Marzo inclusive - suele usarse para el Family
              Day).
            </List.Item>
            <List.Item>Vacaciones de Invierno: Del 14 al 30 de Julio</List.Item>
            <List.Item>Feriados y Fines de Semana Largos.</List.Item>
            <List.Item>
              No abusar de las estadías en épocas vacacionales, para dar lugar a
              la mayor cantidad de personas a ir.
            </List.Item>
            <List.Item>
              En el caso que en cualquiera de estos momentos exclusivos de
              familia, alguna de las casas quede sin reserva, se podrá coordinar
              con los familiares que reservaron para acordar una reserva con
              amigos. Pero la prioridad siempre es de uso exclusivo de la
              Familia.
            </List.Item>
          </List>
        </Paper>

        <Paper withBorder p="md" mt="xl" style={{ width: "100%" }}  radius="lg" >
          <Title order={3} ta="center" mb="md">Espacios no Exclusivos (Se puede reservar para ir con amigos)</Title>
          <List spacing="xs">
            <List.Item>
              <Text fw={700}>
                Cada Tío/a Jasminoy y Cada Sobrino/a podrá reservar hasta 1 fin
                de semana al año para ir con amigos (Este cálculo se realizó
                considerando la cantidad que somos y fin de semanas normales que
                quedan disponibles en el año. En promedio quedan 30 fines de
                semanas libres en el año y somos 31 Tí@s / Sobrin@s que estamos
                en Argentina).
              </Text>
            </List.Item>
            <List.Item>
              Las reservas completas, sólo pueden ser elegidas si la ocupación
              es total, no funcionan como reservas exclusivas. En el caso de que
              en una reserva quede disponible lugar o una casa, cualquier tío/a
              <Text component="span" fw={700} ml={"xs"}>Capacidad Total "CT"</Text>: Reserva de todo el campo
              familiar para uso exclusivo. (no importa si ya hizo uso de su reserva
              anual con amigos).
            </List.Item>
          </List>
        </Paper>

        <Paper withBorder p="md" mt="xl" style={{ width: "100%" }} radius="lg">
          <Title order={3} ta="center" mb="md">Algunas consideraciones</Title>
          <List spacing="xs">
            <List.Item icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                <IconUser size={14} />
              </ThemeIcon>
            }>
              Juampi es el único que puede hacer uso de reservas exclusivas.
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="orange" size={24} radius="xl">
                <IconSettings size={14} />
              </ThemeIcon>
            }>
              Gonzalo puede reservar 4 veces en el año, por el rol que cumple en
              el campo en cuanto al mantenimiento y cuidado.
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="green" size={24} radius="xl">
                <IconEdit size={14} />
              </ThemeIcon>
            }>
              Para reservar, completar todos los datos en la App: Fecha y
              Cantidad de Personas/Casas a usar.
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="purple" size={24} radius="xl">
                <IconMessage size={14}  />
              </ThemeIcon>
               
            }>
              En caso que un finde la casa este vacía, consultar en el grupo de
              La Margarita y si esta libre agregar la opción "Finde Libre" para
              resevar.
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="teal" size={24} radius="xl">
                <IconCalendar size={14} />
              </ThemeIcon>
            }>
              En el caso de cancelación por diferentes motivos, tratar de
              hacerlo lo antes posible a través de la actualización de la App y
              avisando en el Chat Exclusivo de La Margarita sobre todo si la
              fecha es dentro de los próximos 30 días, así alguien más puede
              aprovechar la fecha.
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="red" size={24} radius="xl">
                <IconPawOff size={14} />
              </ThemeIcon>
            }>Evitar llevar mascota.</List.Item>
            <List.Item icon={
              <ThemeIcon color="indigo" size={24} radius="xl">
                <IconHome size={14} />
              </ThemeIcon>
            }>Dejar ordenadas las casas.</List.Item>
            <List.Item icon={
              <ThemeIcon color="green" size={24} radius="xl">
                <IconTrash size={14} />
              </ThemeIcon>
            }>
              Llevarse la Basura (tanto del cesto de las cocinas como de los
              baños).
            </List.Item>
            <List.Item icon={
              <ThemeIcon color="yellow" size={24} radius="xl">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
            }>
              Si encuentran algo roto o se rompe algo durante la estadía avisar
              en el Chat Exclusivo de La Margarita.
            </List.Item>
          </List>
        </Paper>
        <Paper withBorder p="md" mt="xl" style={{ width: "100%" }}  radius="lg" >
          <Title order={4} mb="md" ta="center">Tipos de reserva</Title>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text>Capacidad Total</Text>
              <Badge color="red" variant="filled" style={{ minWidth: '50px' }}>CT</Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Text>Parcial Ambas Casas</Text>
              <Badge color="yellow" variant="filled" style={{ minWidth: '50px' }}>PA</Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Text>Sólo Casa Principal</Text>
              <Badge color="blue" variant="filled" style={{ minWidth: '50px' }}>PR</Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Text>Sólo Casita</Text>
              <Badge color="lime" variant="filled" style={{ minWidth: '50px' }}>CS</Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Text>No compartible</Text>
              <Badge color="grape" variant="filled" style={{ minWidth: '50px' }}>NC</Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Text>Finde Libre</Text>
              <Badge color="cyan" variant="filled" style={{ minWidth: '50px' }}>FL</Badge>
            </Group>
          </Stack>
        </Paper>

        <Title order={4} ta="center" fw={700} mt="xl" mb="md">
          ¡Compartamos juntos familia y amistades!
        </Title>
        <Group justify="center" mt="xl" style={{ width: "100%" }}>
          <Button 
            component={Link} 
            href="/calendar"
            variant="outline" 
            color="green"
            size="lg"
            w={{ base: '100%', sm: 250 }}
          >
            Hacer Reserva
          </Button>
        </Group>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
