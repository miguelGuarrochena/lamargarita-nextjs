'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AmigosQuota } from '@/types';

/**
 * Consulta el cupo anual de reservas "Amigos" de la persona autenticada.
 * Es solo para mostrar estado y dar feedback: la restricción real vive en el
 * backend (`amigosQuotaDb.ts` + índice único en Mongo).
 */
export function useAmigosQuota(year: number | null, enabled = true) {
  const [quota, setQuota] = useState<AmigosQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || year === null) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/amigos-quota?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.ok) setQuota(data.quota as AmigosQuota);
    } catch {
      // El cupo es informativo; si falla, el formulario sigue funcionando.
    } finally {
      setIsLoading(false);
    }
  }, [enabled, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, isLoading, refresh };
}
