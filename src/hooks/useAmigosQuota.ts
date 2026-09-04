'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AmigosQuota } from '@/types';

/**
 * Consulta el cupo anual de reservas "Amigos" de la persona autenticada.
 * Es solo para mostrar estado y dar feedback: la restricción real vive en el
 * backend (`amigosQuotaDb.ts` + índice único en Mongo).
 */
export function useAmigosQuota(year: number | null, enabled = true, excludeEventId?: string) {
  const [quota, setQuota] = useState<AmigosQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || year === null) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (excludeEventId) params.set('excludeEventId', excludeEventId);

      const response = await fetch(`/api/amigos-quota?${params}`, {
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
  }, [enabled, year, excludeEventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, isLoading, refresh };
}
