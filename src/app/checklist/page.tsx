'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { useAuthStore, useCalendarStore } from '@/hooks';
import { Navbar } from '@/components';
import {
  checklistSections,
  checklistQuotes,
  totalChecklistItems,
} from '@/lib/checklistData';
import {
  getRelevantCheckoutEnd,
  parseChecklistStorage,
  resolveChecklistState,
} from '@/lib/checklistStorage';
import {
  AppShell,
  Container,
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Checkbox,
  Progress,
  Button,
  ThemeIcon,
  Badge,
  SimpleGrid,
  Center,
  Loader,
  Divider,
  Modal,
  Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBed,
  IconBath,
  IconArmchair,
  IconToolsKitchen2,
  IconShirt,
  IconBike,
  IconRefresh,
  IconCircleCheck,
} from '@tabler/icons-react';

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  bed: IconBed,
  bath: IconBath,
  armchair: IconArmchair,
  kitchen: IconToolsKitchen2,
  shirt: IconShirt,
  bike: IconBike,
};

const storageKey = (uid?: string) => `lm-checklist:${uid ?? 'anon'}`;

export default function ChecklistPage() {
  const { status, user, checkAuthToken } = useAuthStore();
  const { events, startLoadingEvents } = useCalendarStore();
  const router = useRouter();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [linkedCheckoutEnd, setLinkedCheckoutEnd] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [eventsReady, setEventsReady] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const wasCompleteRef = useRef<boolean | null>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    checkAuthToken();
  }, [checkAuthToken]);

  useEffect(() => {
    if (status === 'not-authenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    startLoadingEvents({ silent: true }).finally(() => setEventsReady(true));
  }, [status, startLoadingEvents]);

  useEffect(() => {
    if (status !== 'authenticated' || !eventsReady || !user?.uid) return;

    const persisted = parseChecklistStorage(
      localStorage.getItem(storageKey(user.uid))
    );
    const resolved = resolveChecklistState(persisted, events, user.uid);

    setChecked(resolved.items);
    setLinkedCheckoutEnd(resolved.linkedCheckoutEnd);
    setLoaded(true);
  }, [status, user?.uid, eventsReady, events]);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined' || !user?.uid) return;

    localStorage.setItem(
      storageKey(user.uid),
      JSON.stringify({ items: checked, linkedCheckoutEnd })
    );
  }, [checked, linkedCheckoutEnd, loaded, user?.uid]);

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        return next;
      });

      if (user?.uid) {
        const checkout = getRelevantCheckoutEnd(events, user.uid);
        if (checkout) setLinkedCheckoutEnd(checkout);
      }
    },
    [events, user?.uid]
  );

  const checkedCount = useMemo(
    () =>
      checklistSections.reduce(
        (acc, s) =>
          acc + s.items.filter((_, i) => checked[`${s.id}-${i}`]).length,
        0
      ),
    [checked]
  );

  const pct = Math.round((checkedCount / totalChecklistItems) * 100);
  const remaining = totalChecklistItems - checkedCount;
  const complete = remaining === 0;

  useEffect(() => {
    if (!loaded) return;

    if (wasCompleteRef.current === null) {
      wasCompleteRef.current = complete;
      return;
    }

    if (complete && !wasCompleteRef.current) {
      setShowThanks(true);
    }

    wasCompleteRef.current = complete;
  }, [complete, loaded]);

  const resetAll = useCallback(() => {
    Swal.fire({
      title: '¿Reiniciar el checklist?',
      text: 'Se van a desmarcar todos los ítems.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reiniciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1a9d7a',
    }).then((res) => {
      if (res.isConfirmed) {
        setChecked({});
        wasCompleteRef.current = false;
      }
    });
  }, []);

  const closeThanks = useCallback(() => {
    setShowThanks(false);
    setChecked({});
    wasCompleteRef.current = false;
  }, []);

  if (status === 'checking' || !loaded) {
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
        <Container size="md" py={{ base: 32, sm: 48 }}>
          <Title order={2} fw={700} ta="center" mb={6}>
            To Do List en el Check-out
          </Title>
          <Text ta="center" c="dimmed" size="sm" mb="xl">
            Antes de irte, repasá que todo quede en orden.
          </Text>

          <Paper className="lm-card" p="lg" radius="lg" mb="xl">
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm">
                {checkedCount} de {totalChecklistItems} completados
              </Text>
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                leftSection={<IconRefresh size={14} />}
                onClick={resetAll}
              >
                Reiniciar
              </Button>
            </Group>
            <Progress value={pct} color="brand" size="md" radius="xl" />
            <Text size="xs" c={complete ? 'brand.7' : 'dimmed'} mt="sm">
              {complete
                ? '¡Todo en orden, podés irte tranquilo!'
                : `Te quedan ${remaining} ítems por marcar`}
            </Text>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {checklistSections.map((section) => {
              const Icon = iconMap[section.icon] ?? IconCircleCheck;
              const sectionChecked = section.items.filter(
                (_, i) => checked[`${section.id}-${i}`]
              ).length;
              const sectionComplete = sectionChecked === section.items.length;

              return (
                <Paper key={section.id} className="lm-card" p="lg" radius="lg">
                  <Group justify="space-between" mb="md">
                    <Group gap="sm">
                      <ThemeIcon
                        size={32}
                        radius="md"
                        variant={sectionComplete ? 'filled' : 'light'}
                        color="brand"
                      >
                        <Icon size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">{section.title}</Text>
                    </Group>
                    <Badge
                      size="sm"
                      variant={sectionComplete ? 'filled' : 'light'}
                      color={sectionComplete ? 'brand' : 'gray'}
                    >
                      {sectionChecked}/{section.items.length}
                    </Badge>
                  </Group>

                  <Stack gap="xs">
                    {section.items.map((item, i) => {
                      const id = `${section.id}-${i}`;
                      const isDone = !!checked[id];
                      return (
                        <Checkbox
                          key={id}
                          checked={isDone}
                          onChange={() => toggle(id)}
                          color="brand"
                          size="sm"
                          label={
                            <Text
                              size="sm"
                              style={{
                                textDecoration: isDone ? 'line-through' : 'none',
                                color: isDone ? 'var(--lm-text-dim)' : 'inherit',
                              }}
                            >
                              {item}
                            </Text>
                          }
                        />
                      );
                    })}
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>

          <Divider my="xl" />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {checklistQuotes.map((q) => (
              <Paper key={q.author} className="lm-card" p="lg" radius="lg">
                <Text className="lm-script" style={{ fontSize: '1.25rem', color: 'var(--lm-green-600)', lineHeight: 1.4 }}>
                  &ldquo;{q.text}&rdquo;
                </Text>
                <Text className="lm-script-fancy" mt="xs" size="sm" c="dimmed">
                  — {q.author}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>

          <Text className="lm-script-fancy" ta="center" mt="xl" c="brand.7" style={{ fontSize: '1.5rem' }}>
            Gracias por colaborar — La Margarita
          </Text>
        </Container>

        <Modal
          opened={showThanks}
          onClose={closeThanks}
          centered
          padding={0}
          size="md"
          title={null}
          styles={{
            content: { overflow: 'hidden' },
            close: { zIndex: 2 },
          }}
        >
          <Box
            pos="relative"
            w="100%"
            style={{
              aspectRatio: '3 / 4',
              maxHeight: 'min(72vh, 520px)',
            }}
          >
            <Image
              src="/images/pardo.jpeg"
              alt="Pardo en La Margarita"
              fill
              sizes="(max-width: 768px) 90vw, 440px"
              priority
              style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
            />
          </Box>
          <Stack align="center" gap="xs" p="lg" pt="md">
            <Text
              className="lm-script-fancy"
              ta="center"
              c="brand.7"
              style={{ fontSize: '1.75rem', lineHeight: 1.2 }}
            >
              ¡Gracias por tu visita!
            </Text>
            <Button mt="sm" fullWidth={isMobile} onClick={closeThanks}>
              Cerrar
            </Button>
          </Stack>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
}
