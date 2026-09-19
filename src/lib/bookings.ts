/**
 * Работа с заявками поверх Prisma: занятые слоты, создание с проверкой доступности,
 * выборка для админки. Route handlers остаются тонкими.
 */
import { Prisma, type Booking } from "@prisma/client";
import { getBranch, type BranchId } from "@/config/site";
import { addDays } from "@/lib/dates";
import { buildSnapshot, validateOrder, type MiniappOrder } from "@/lib/miniapp";
import { prisma } from "@/lib/prisma";
import type { BookingPayload, BookingStatus } from "@/lib/schemas/booking";
import { normalizePhone } from "@/lib/phone";
import {
  generateDaySlots,
  getBookingDateRange,
  isBranchOpenOn,
  isDateWithinRange,
  isSlotAvailable,
} from "@/lib/slots";

/** Отменённые заявки слот не занимают */
const ACTIVE_STATUSES: BookingStatus[] = ["new", "confirmed", "done"];

export async function getBusyTimes(branchId: BranchId, date: string): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    // time: null — визит без получасового слота (сдача шин), место он не занимает
    where: { branchId, date, status: { in: ACTIVE_STATUSES }, time: { not: null } },
    select: { time: true },
  });
  return rows.map((r) => r.time as string);
}

/**
 * Занятые времена сразу за диапазон дат — одним запросом вместо запроса на каждый день.
 * Так календарь Mini App на 30 дней вперёд рисуется за один поход в базу.
 */
export async function getBusyRange(
  branchId: BranchId,
  from: string,
  to: string,
): Promise<Record<string, string[]>> {
  const rows = await prisma.booking.findMany({
    where: {
      branchId,
      date: { gte: from, lte: to },
      status: { in: ACTIVE_STATUSES },
      time: { not: null },
    },
    select: { date: true, time: true },
  });

  const busy: Record<string, string[]> = {};
  for (let date = from; date <= to; date = addDays(date, 1)) busy[date] = [];
  for (const row of rows) (busy[row.date] ??= []).push(row.time as string);
  for (const times of Object.values(busy)) times.sort();
  return busy;
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

/**
 * Частичный уникальный индекс Booking_slot_unique (prisma/constraints.sql) —
 * последняя линия обороны от двойной брони: на Postgres проверка внутри транзакции
 * не спасает, две одновременные транзакции обе видят слот свободным.
 * Отказ базы превращаем в ту же ошибку, что и проверка в приложении.
 */
function isSlotConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
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

  // Проверка в транзакции отсекает большинство столкновений и даёт понятную ошибку;
  // остаток гонки закрывает уникальный индекс, поэтому оба пути ведут к SlotUnavailableError.
  try {
    return await prisma.$transaction(async (tx) => {
      const busyRows = await tx.booking.findMany({
        where: {
          branchId: payload.branchId,
          date: payload.date,
          status: { in: ACTIVE_STATUSES },
          time: { not: null },
        },
        select: { time: true },
      });
      const busy = busyRows.map((r) => r.time as string);

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
          source: "site",
          ip: meta.ip ?? null,
        },
      });
    });
  } catch (error) {
    if (isSlotConflict(error)) throw new SlotUnavailableError();
    throw error;
  }
}

/* ---------- заявки из Telegram Mini App ---------- */

/**
 * Заявка из Mini App. Отличий от заявки с сайта три: известен Telegram id,
 * сумма считается здесь же из проверенного заказа, а у хранения нет времени визита.
 */
export async function createMiniappBooking(
  order: MiniappOrder,
  telegramId: string,
  meta: { ip?: string; now?: Date } = {},
): Promise<Booking> {
  const now = meta.now ?? new Date();
  const service = validateOrder(order);
  const branch = getBranch(order.branchId);
  if (!branch) throw new Error(`Неизвестный филиал: ${order.branchId}`);

  const range = getBookingDateRange(now);
  if (!isDateWithinRange(order.date, range)) throw new SlotUnavailableError();
  if (!isBranchOpenOn(branch, order.date)) throw new SlotUnavailableError();

  // Цену считает сервер: то, что прислал клиент, не используется вообще
  const snapshot = buildSnapshot(order);

  try {
    return await prisma.$transaction(async (tx) => {
      if (order.time !== null) {
        const busyRows = await tx.booking.findMany({
          where: {
            branchId: order.branchId,
            date: order.date,
            status: { in: ACTIVE_STATUSES },
            time: { not: null },
          },
          select: { time: true },
        });
        const busy = busyRows.map((r) => r.time as string);
        if (!isSlotAvailable(branch, order.date, order.time, { now, busy })) {
          throw new SlotUnavailableError();
        }
      }

      return tx.booking.create({
        data: {
          name: order.name,
          phone: order.phone,
          branchId: order.branchId,
          date: order.date,
          time: order.time,
          calculation: JSON.stringify(snapshot),
          calcTotal: snapshot.total,
          status: "new",
          source: "miniapp",
          service: service.id,
          telegramId,
          ip: meta.ip ?? null,
        },
      });
    });
  } catch (error) {
    if (isSlotConflict(error)) throw new SlotUnavailableError();
    throw error;
  }
}

/** Активные записи одного клиента: прошедшие не показываем, список — про то, что предстоит */
export async function listMiniappBookings(telegramId: string, now = new Date()) {
  const today = getBookingDateRange(now).min;
  return prisma.booking.findMany({
    where: { telegramId, status: { in: ACTIVE_STATUSES }, date: { gte: today } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: 50,
  });
}

export class BookingNotFoundError extends Error {
  constructor() {
    super("Запись не найдена");
    this.name = "BookingNotFoundError";
  }
}

export class BookingForbiddenError extends Error {
  constructor() {
    super("Эта запись принадлежит другому пользователю");
    this.name = "BookingForbiddenError";
  }
}

/**
 * Отмена своей записи. Telegram id приходит из проверенного initData, поэтому
 * знание чужого номера не помогает: сверка владельца идёт по нему, а не по телу запроса.
 */
export async function cancelMiniappBooking(telegramId: string, id: number): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.source !== "miniapp") throw new BookingNotFoundError();
  if (booking.telegramId !== telegramId) throw new BookingForbiddenError();
  if (booking.status === "cancelled") return booking;

  return prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
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
