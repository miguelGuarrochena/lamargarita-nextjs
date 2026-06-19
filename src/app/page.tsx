'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  ThemeIcon,
  Box,
  SimpleGrid,
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
  IconAlertTriangle,
  IconUsersGroup,
  IconArrowRight,
  IconChecklist,
} from '@tabler/icons-react';

function PhotoTextBlock({
  photo,
  reverse = false,
  children,
}: {
  photo: { src: string; alt: string };
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box className={`lm-photo-row${reverse ? ' lm-photo-row--reverse' : ''}`}>
      <Box className="lm-photo-row__image">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
        />
      </Box>
      <Box className="lm-photo-row__content">{children}</Box>
    </Box>
  );
}

const bookingTypes = [
  { label: 'Capacidad Total', code: 'CT', color: 'red' },
  { label: 'Parcial Ambas Casas', code: 'PA', color: 'yellow' },
  { label: 'Sólo Casa Principal', code: 'PR', color: 'blue' },
  { label: 'Sólo Casita', code: 'CS', color: 'lime' },
  { label: 'No compartible', code: 'NC', color: 'grape' },
  { label: 'Finde Libre', code: 'FL', color: 'cyan' },
];

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper className="lm-card lm-card--static" p="xl" radius="lg">
      <Group gap="sm" mb="md">
        <ThemeIcon size={36} radius="md" variant="light" color="brand">
          {icon}
        </ThemeIcon>
        <Title order={4} fw={700}>{title}</Title>
      </Group>
      {children}
    </Paper>
  );
}

export default function HomePage() {
  const { status, checkAuthToken } = useAuthStore();
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

  if (status === 'not-authenticated') return null;

  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <Navbar />

      <AppShell.Main className="lm-shell-main">
        <Container size="lg" pt={{ base: 40, sm: 56 }} pb="lg">
          <Stack align="center" gap="md" mb="xl" className="lm-hero-enter">
            <Title
              order={1}
              ta="center"
              fw={700}
              style={{
                fontSize: 'clamp(2rem, 5.5vw, 2.85rem)',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Disfrutemos{' '}
              <Text span inherit style={{ color: 'var(--lm-green-600)' }}>
                el campo
              </Text>
              ,
              <br />
              cuidémoslo entre todos.
            </Title>
            <Text ta="center" c="dimmed" maw={520} size="md" style={{ lineHeight: 1.6 }}>
              Reservá tus días en La Margarita y pasá por el checklist al salir.
            </Text>
            <Group gap="sm" mt="xs">
              <Button
                component={Link}
                href="/calendar"
                rightSection={<IconArrowRight size={16} />}
              >
                Hacer una reserva
              </Button>
              <Button
                component={Link}
                href="/checklist"
                variant="light"
                leftSection={<IconChecklist size={16} />}
              >
                Checklist
              </Button>
            </Group>
          </Stack>

          <Stack gap={0} mb="xl">
            <PhotoTextBlock photo={{ src: '/images/campo.jpeg', alt: 'El campo al atardecer' }}>
              <SectionCard icon={<IconUsersGroup size={20} />} title="Espacios exclusivos para la familia">
                <List spacing="sm" c="dark.5" size="sm">
                  <List.Item>
                    Vacaciones de Verano (a partir del 20 de Diciembre aprox. hasta el
                    1er fin de semana de Marzo inclusive — suele usarse para el Family Day).
                  </List.Item>
                  <List.Item>Vacaciones de Invierno: del 14 al 30 de Julio.</List.Item>
                  <List.Item>Feriados y fines de semana largos.</List.Item>
                  <List.Item>
                    No abusar de las estadías en épocas vacacionales, para dar lugar a
                    la mayor cantidad de personas.
                  </List.Item>
                  <List.Item>
                    Si en estos momentos exclusivos alguna de las casas queda sin
                    reserva, se podrá coordinar con los familiares que reservaron para
                    acordar una reserva con amigos. Pero la prioridad siempre es el uso
                    exclusivo de la familia.
                  </List.Item>
                </List>
              </SectionCard>
            </PhotoTextBlock>

            <PhotoTextBlock reverse photo={{ src: '/images/cielo.jpeg', alt: 'El cielo en La Margarita' }}>
              <SectionCard icon={<IconHome size={20} />} title="Espacios no exclusivos (se puede ir con amigos)">
                <List spacing="sm" c="dark.5" size="sm">
                  <List.Item>
                    <Text span fw={600}>
                      Cada Tío/a Jasminoy y cada Sobrino/a podrá reservar hasta 1 fin de
                      semana al año para ir con amigos.
                    </Text>{' '}
                    Este cálculo considera la cantidad que somos y los fines de semana
                    normales disponibles en el año (en promedio quedan 30 fines de
                    semana libres y somos 31 Tí@s / Sobrin@s en Argentina).
                  </List.Item>
                  <List.Item>
                    Las reservas completas sólo pueden elegirse si la ocupación es
                    total; no funcionan como reservas exclusivas. Si en una reserva
                    queda lugar o una casa disponible, cualquier tío/a puede sumarse.
                    <Text span fw={600} ml={4}>
                      Capacidad Total &quot;CT&quot;
                    </Text>
                    : reserva de todo el campo familiar para uso exclusivo.
                  </List.Item>
                </List>
              </SectionCard>
            </PhotoTextBlock>

            <PhotoTextBlock photo={{ src: '/images/entrada.jpeg', alt: 'La entrada al campo' }}>
              <SectionCard icon={<IconAlertTriangle size={20} />} title="Algunas consideraciones">
                <List spacing="md" size="sm">
                  <List.Item icon={<ThemeIcon color="blue" size={24} radius="xl" variant="light"><IconUser size={14} /></ThemeIcon>}>
                    Juampi es el único que puede hacer uso de reservas exclusivas.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="orange" size={24} radius="xl" variant="light"><IconSettings size={14} /></ThemeIcon>}>
                    Gonzalo puede reservar 4 veces al año, por su rol en el mantenimiento y cuidado del campo.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="green" size={24} radius="xl" variant="light"><IconEdit size={14} /></ThemeIcon>}>
                    Para reservar, completá todos los datos en la app: fecha y cantidad de personas/casas a usar.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="grape" size={24} radius="xl" variant="light"><IconMessage size={14} /></ThemeIcon>}>
                    Si un finde la casa está vacía, consultá en el grupo de La Margarita y, si está libre, agregá &quot;Finde Libre&quot;.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="teal" size={24} radius="xl" variant="light"><IconCalendar size={14} /></ThemeIcon>}>
                    Si tenés que cancelar, hacelo lo antes posible actualizando la app y avisando en el chat.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="red" size={24} radius="xl" variant="light"><IconPawOff size={14} /></ThemeIcon>}>
                    Evitar llevar mascotas.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="indigo" size={24} radius="xl" variant="light"><IconHome size={14} /></ThemeIcon>}>
                    Dejar ordenadas las casas.
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="green" size={24} radius="xl" variant="light"><IconTrash size={14} /></ThemeIcon>}>
                    Llevarse la basura (tanto del cesto de las cocinas como de los baños).
                  </List.Item>
                  <List.Item icon={<ThemeIcon color="yellow" size={24} radius="xl" variant="light"><IconAlertTriangle size={14} /></ThemeIcon>}>
                    Si encontrás algo roto o se rompe algo durante la estadía, avisá en el chat exclusivo de La Margarita.
                  </List.Item>
                </List>
              </SectionCard>
            </PhotoTextBlock>
          </Stack>

          <Stack gap="lg">
            <SectionCard icon={<IconCalendar size={20} />} title="Tipos de reserva">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {bookingTypes.map((t) => (
                  <Group key={t.code} justify="space-between" px="sm" py="xs">
                    <Text size="sm">{t.label}</Text>
                    <Badge color={t.color} variant="filled" style={{ minWidth: 46 }}>
                      {t.code}
                    </Badge>
                  </Group>
                ))}
              </SimpleGrid>
            </SectionCard>

            <Stack align="center" gap="md" py="md">
              <Title order={4} ta="center" fw={700}>
                ¡Compartamos juntos familia y amistades!
              </Title>
              <Button
                component={Link}
                href="/calendar"
                size="md"
                w={{ base: '100%', sm: 260 }}
                rightSection={<IconArrowRight size={16} />}
              >
                Hacer reserva
              </Button>
            </Stack>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
