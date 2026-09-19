import type { NextRequest } from "next/server";
import { createMiniappBooking, listMiniappBookings } from "@/lib/bookings";
import { miniappOrderSchema, publicBooking } from "@/lib/miniapp";
import { fail, ok, requireUser, toResponse } from "@/lib/miniapp-http";
import { getBookingRateLimitOptions, getClientIp, rateLimit } from "@/lib/rate-limit";

/** GET /api/miniapp/bookings — активные записи того, кто открыл приложение */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const rows = await listMiniappBookings(String(user.id));
    return ok({ bookings: rows.map(publicBooking) });
  } catch (error) {
    return toResponse(error, "api/miniapp/bookings GET");
  }
}

/**
 * POST /api/miniapp/bookings — запись из Mini App.
 *
 * Из тела берутся только параметры заказа: сумму сервер считает сам, а владельца
 * определяет по Telegram id из проверенной подписи, а не по тому, что прислал клиент.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);

    // Лимит по Telegram id, а не по IP: за одним мобильным NAT сидит полгорода
    const limit = rateLimit(`miniapp:${user.id}`, getBookingRateLimitOptions());
    if (!limit.ok) {
      return fail(
        "rate_limited",
        `Слишком много заявок подряд. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин`,
        429,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("validation", "Тело запроса должно быть JSON", 400);
    }

    const parsed = miniappOrderSchema.safeParse(body);
    if (!parsed.success) {
      return fail("validation", parsed.error.issues[0]?.message ?? "Проверьте данные", 400);
    }

    const booking = await createMiniappBooking(parsed.data, String(user.id), {
      ip: getClientIp(request),
    });
    return ok({ booking: publicBooking(booking) }, 201);
  } catch (error) {
    return toResponse(error, "api/miniapp/bookings POST");
  }
}
