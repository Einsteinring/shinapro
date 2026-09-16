/**
 * Работа с заявками поверх Prisma: занятые слоты, создание с проверкой доступности,
 * выборка для админки. Route handlers остаются тонкими.
 */
import type { Booking, Prisma } from "@prisma/client";
import { getBranch, type BranchId } from "@/config/site";
import { prisma } from "@/lib/prisma";
import type { BookingPayload, BookingStatus } from "@/lib/schemas/booking";
import { normalizePhone } from "@/lib/phone";
import {
  generateDaySlots,
  getBookingDateRange,
  isDateWithinRange,
  isSlotAvailable,
} from "@/lib/slots";

/** Отменённые заявки слот не занимают */
const ACTIVE_STATUSES: BookingStatus[] = ["new", "confirmed", "done"];

export async function getBusyTimes(branchId: BranchId, date: string): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    where: { branchId, date, status: { in: ACTIVE_STATUSES } },
    select: { time: true },
  });
  return rows.map((r) => r.time);
}

export async function getSlotsForDay(branchId: BranchId, date: string, now = new Date()) {
  const branch = getBranch(branchId);
  if (!branch) throw new Error(`Неизвестный филиал: ${branchId}`);

  const range = getBookingDateRange(now);
  if (!isDateWithinRange(date, range)) return { slots: [], open: false, range };

  const busy = await getBusyTimes(branchId, date);
  const slots = generateDaySlots(branch, date, { now, busy });
  return { slots, open: slots.length > 0, range };
}

export class SlotUnavailableError extends Error {
  constructor() {
    super("Выбранное время уже занято или недоступно");
    this.name = "SlotUnavailableError";
  }
}

export async function createBooking(
  payload: BookingPayload,
  meta: { ip?: string; now?: Date } = {},
): Promise<Booking> {
  const now = meta.now ?? new Date();
  const branch = getBranch(payload.branchId);
  if (!branch) throw new Error(`Неизвестный филиал: ${payload.branchId}`);

  const range = getBookingDateRange(now);
  if (!isDateWithinRange(payload.date, range)) throw new SlotUnavailableError();

  // SQLite сериализует записи, поэтому проверка + вставка в одной транзакции
  // защищает от двойного бронирования при одновременных запросах.
  return prisma.$transaction(async (tx) => {
    const busyRows = await tx.booking.findMany({
      where: { branchId: payload.branchId, date: payload.date, status: { in: ACTIVE_STATUSES } },
      select: { time: true },
    });
    const busy = busyRows.map((r) => r.time);

    if (!isSlotAvailable(branch, payload.date, payload.time, { now, busy })) {
      throw new SlotUnavailableError();
    }

    return tx.booking.create({
      data: {
        name: payload.name,
        phone: normalizePhone(payload.phone),
        car: payload.car || null,
        branchId: payload.branchId,
        date: payload.date,
        time: payload.time,
        comment: payload.comment || null,
        calculation: payload.calculation ? JSON.stringify(payload.calculation) : null,
        calcTotal: payload.calculation?.total ?? null,
        status: "new",
        ip: meta.ip ?? null,
      },
    });
  });
}

export interface BookingFilters {
  status?: BookingStatus;
  from?: string;
  to?: string;
  branchId?: BranchId;
}

export async function listBookings(filters: BookingFilters, limit = 200): Promise<Booking[]> {
  const where: Prisma.BookingWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  return prisma.booking.findMany({
    where,
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: limit,
  });
}

export async function updateBookingStatus(
  id: number,
  status: BookingStatus,
): Promise<Booking | null> {
  const exists = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return null;
  return prisma.booking.update({ where: { id }, data: { status } });
}

export async function countBookingsByStatus(): Promise<Record<BookingStatus, number>> {
  const rows = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  const result: Record<BookingStatus, number> = { new: 0, confirmed: 0, done: 0, cancelled: 0 };
  for (const row of rows) {
    if (row.status in result) result[row.status as BookingStatus] = row._count._all;
  }
  return result;
}
