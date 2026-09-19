import { NextResponse } from "next/server";
import { createBooking, SlotUnavailableError } from "@/lib/bookings";
import { formatBookingNumber } from "@/lib/format";
import { getBookingRateLimitOptions, getClientIp, rateLimit } from "@/lib/rate-limit";
import { bookingSchema } from "@/lib/schemas/booking";

/**
 * POST /api/bookings — создание заявки.
 * Порядок: honeypot → rate limit → валидация той же Zod-схемой, что и на клиенте →
 * транзакция с проверкой слота. Уведомлений в Telegram нет: заявки и с сайта,
 * и из Mini App живут в одной таблице и разбираются в админке.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "validation", message: "Тело запроса должно быть JSON" },
      { status: 400 },
    );
  }

  // Honeypot: боту отвечаем «успехом», чтобы не подсказывать, что его раскрыли
  if (typeof body === "object" && body !== null && "website" in body && body.website) {
    return NextResponse.json(
      { ok: true, booking: { id: 0, number: "SP-00000", date: "", time: "", branchId: "" } },
      { status: 201 },
    );
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`booking:${ip}`, getBookingRateLimitOptions());
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: `Слишком много заявок. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин или позвоните нам.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const issues = Object.fromEntries(
      parsed.error.issues.map((i) => [i.path.join(".") || "_", i.message]),
    );
    return NextResponse.json(
      { ok: false, error: "validation", message: "Проверьте заполнение формы", issues },
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(parsed.data, { ip });

    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: booking.id,
          number: formatBookingNumber(booking.id),
          date: booking.date,
          time: booking.time,
          branchId: booking.branchId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json(
        { ok: false, error: "slot_taken", message: error.message },
        { status: 409 },
      );
    }
    console.error("[api/bookings]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "server",
        message: "Не удалось сохранить заявку. Попробуйте позже или позвоните нам.",
      },
      { status: 500 },
    );
  }
}
