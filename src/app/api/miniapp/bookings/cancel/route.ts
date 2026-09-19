import type { NextRequest } from "next/server";
import { cancelMiniappBooking } from "@/lib/bookings";
import { publicBooking } from "@/lib/miniapp";
import { fail, ok, requireUser, toResponse } from "@/lib/miniapp-http";

/**
 * POST /api/miniapp/bookings/cancel — отмена своей записи.
 *
 * Владелец сверяется по Telegram id из проверенного initData, поэтому знание
 * чужого номера заявки ничего не даёт: придёт 403, а слот останется занятым.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("validation", "Тело запроса должно быть JSON", 400);
    }

    const id = (body as { id?: unknown })?.id;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return fail("validation", "Некорректный номер записи", 400);
    }

    const booking = await cancelMiniappBooking(String(user.id), id);
    return ok({ ok: true, booking: publicBooking(booking) });
  } catch (error) {
    return toResponse(error, "api/miniapp/bookings/cancel");
  }
}
