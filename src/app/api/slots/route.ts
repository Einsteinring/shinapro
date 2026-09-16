import { NextResponse, type NextRequest } from "next/server";
import { getSlotsForDay } from "@/lib/bookings";
import { slotsQuerySchema } from "@/lib/schemas/booking";

/** GET /api/slots?branch=moskovskaya&date=2026-09-20 → свободные и занятые слоты дня */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = slotsQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation",
        message: "Некорректные параметры: нужны branch и date (YYYY-MM-DD)",
      },
      { status: 400 },
    );
  }

  try {
    const { slots, open } = await getSlotsForDay(parsed.data.branch, parsed.data.date);
    return NextResponse.json(
      { ok: true, open, slots },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/slots]", error);
    return NextResponse.json(
      { ok: false, error: "server", message: "Не удалось получить слоты" },
      { status: 500 },
    );
  }
}
