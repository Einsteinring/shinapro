import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  getSessionExpiry,
  isAdminConfigured,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { adminLoginSchema } from "@/lib/schemas/booking";

/** POST /api/admin/login { password } → ставит httpOnly-cookie сессии */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Админка не настроена: задайте ADMIN_PASSWORD и ADMIN_SESSION_SECRET в .env",
      },
      { status: 503 },
    );
  }

  const limit = rateLimit(`admin-login:${getClientIp(request)}`, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Слишком много попыток, подождите" },
      { status: 429 },
    );
  }

  const parsed = adminLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ ok: false, message: "Неверный пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE,
    createSessionToken(),
    sessionCookieOptions(getSessionExpiry()),
  );
  return response;
}
