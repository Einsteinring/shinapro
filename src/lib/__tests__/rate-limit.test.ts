import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimit());

  it("пропускает до лимита и блокирует сверх него", () => {
    const opts = { max: 3, windowMs: 60_000 };
    const t = 1_000_000;
    expect(rateLimit("ip", opts, t).ok).toBe(true);
    expect(rateLimit("ip", opts, t + 1).ok).toBe(true);
    expect(rateLimit("ip", opts, t + 2)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = rateLimit("ip", opts, t + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("окно скользящее: старые запросы перестают учитываться", () => {
    const opts = { max: 1, windowMs: 10_000 };
    expect(rateLimit("ip", opts, 0).ok).toBe(true);
    expect(rateLimit("ip", opts, 5_000).ok).toBe(false);
    expect(rateLimit("ip", opts, 10_000).ok).toBe(true);
  });

  it("ключи независимы", () => {
    const opts = { max: 1, windowMs: 10_000 };
    expect(rateLimit("a", opts, 0).ok).toBe(true);
    expect(rateLimit("b", opts, 0).ok).toBe(true);
  });
});
