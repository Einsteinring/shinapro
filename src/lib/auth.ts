/**
 * Авторизация мини-админки: один пароль из .env, сессия в httpOnly-cookie,
 * подписанной HMAC-SHA256. Без БД сессий: токен = expires.signature.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "shinapro_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET не задан или короче 16 символов (см. .env.example)");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function createSessionToken(now = Date.now()): string {
  const expires = String(now + SESSION_TTL_MS);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, sign(expires));
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function getSessionExpiry(now = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS);
}

/** Для серверных компонентов и route handlers */
export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}
