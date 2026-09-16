/**
 * Простой rate limit по ключу (IP) со скользящим окном, в памяти процесса.
 * Для одного инстанса (VPS, Docker, локально) этого достаточно. На serverless-платформах
 * память не разделяется между инстансами, там стоит заменить хранилище на Redis/Upstash,
 * интерфейс функции при этом не меняется.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const CLEANUP_EVERY_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  cleanupIfNeeded(now, options.windowMs);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

  if (bucket.timestamps.length >= options.max) {
    const oldest = bucket.timestamps[0] ?? now;
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: options.max - bucket.timestamps.length, retryAfterSeconds: 0 };
}

function cleanupIfNeeded(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => now - t >= windowMs)) buckets.delete(key);
  }
}

/** Только для тестов */
export function resetRateLimit() {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getBookingRateLimitOptions(): RateLimitOptions {
  const max = Number(process.env.RATE_LIMIT_MAX ?? 5);
  const minutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 10);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 5,
    windowMs: (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60 * 1000,
  };
}
