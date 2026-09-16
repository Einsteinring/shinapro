import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { updateBookingStatus } from "@/lib/bookings";
import { updateBookingStatusSchema } from "@/lib/schemas/booking";

/** PATCH /api/admin/bookings/:id { status } — смена статуса заявки (только для админа) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ ok: false, message: "Некорректный id" }, { status: 400 });
  }

  const parsed = updateBookingStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Некорректный статус" }, { status: 400 });
  }

  try {
    const booking = await updateBookingStatus(numericId, parsed.data.status);
    if (!booking)
      return NextResponse.json({ ok: false, message: "Заявка не найдена" }, { status: 404 });
    return NextResponse.json({ ok: true, booking: { id: booking.id, status: booking.status } });
  } catch (error) {
    console.error("[api/admin/bookings]", error);
    return NextResponse.json({ ok: false, message: "Не удалось обновить статус" }, { status: 500 });
  }
}
