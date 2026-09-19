import type { NextRequest } from "next/server";
import { getBranch, siteConfig } from "@/config/site";
import { getBusyRange } from "@/lib/bookings";
import { addDays } from "@/lib/dates";
import { isBranchIdSafe } from "@/lib/miniapp";
import { fail, ok, requireUser, toResponse } from "@/lib/miniapp-http";
import { getBookingDateRange, isBranchOpenOn } from "@/lib/slots";

/**
 * GET /api/miniapp/slots?branch=moskovskaya — занятые времена на весь горизонт записи.
 *
 * Отдаём сразу весь диапазон одним ответом: календарь на 30 дней и сетка времени
 * рисуются без запроса на каждый день, а переключение даты происходит мгновенно.
 * Заодно помечаем выходные филиала — у Богатырского воскресенье нерабочее.
 */
export async function GET(request: NextRequest) {
  try {
    requireUser(request);

    const branchId = request.nextUrl.searchParams.get("branch") ?? "";
    if (!isBranchIdSafe(branchId)) {
      return fail("validation", "Неизвестный филиал", 400);
    }
    const branch = getBranch(branchId);
    if (!branch) return fail("validation", "Неизвестный филиал", 400);

    const now = new Date();
    const { min } = getBookingDateRange(now);
    const to = addDays(min, siteConfig.bookingHorizonDays - 1);

    const busy = await getBusyRange(branchId, min, to);
    const closed = Object.keys(busy).filter((date) => !isBranchOpenOn(branch, date));

    return ok({ branch: branchId, from: min, to, busy, closed });
  } catch (error) {
    return toResponse(error, "api/miniapp/slots");
  }
}
