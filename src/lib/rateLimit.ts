import { NextRequest } from 'next/server';

/**
 * Rate limiter simple en memoria (ventana deslizante).
 *
 * Nota: en entornos serverless (p. ej. Vercel) el estado vive por instancia,
 * así que no es un límite global perfecto, pero mitiga la fuerza bruta básica.
 * Para un límite robusto y distribuido conviene usar Upstash Redis / @upstash/ratelimit.
 */
type Hit = { count: number; resetAt: number };

const store = new Map<string, Hit>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || now > hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  hit.count += 1;

  if (hit.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((hit.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

/** Obtiene la IP del cliente a partir de los headers del proxy. */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
