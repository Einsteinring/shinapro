/**
 * Генерация слотов записи. Чистые функции: занятые слоты и «сейчас» приходят снаружи,
 * поэтому логика тестируется без БД и без привязки к текущей дате.
 */
import { siteConfig, type Branch } from "@/config/site";
import { addDays, minutesToTime, nowInTimeZone, weekdayOf } from "@/lib/dates";

export interface Slot {
  time: string;
  available: boolean;
}

export interface SlotOptions {
  now: Date;
  /** Занятые времена в формате HH:mm */
  busy?: Iterable<string>;
  slotMinutes?: number;
  leadMinutes?: number;
  timeZone?: string;
}

export function isBranchOpenOn(branch: Branch, dateISO: string): boolean {
  return branch.schedule[weekdayOf(dateISO)] !== null;
}

/** Диапазон дат, доступных для записи: с сегодня (по времени филиала) на horizonDays вперёд */
export function getBookingDateRange(
  now: Date,
  horizonDays: number = siteConfig.bookingHorizonDays,
  timeZone: string = siteConfig.timeZone,
): { min: string; max: string } {
  const { date } = nowInTimeZone(now, timeZone);
  return { min: date, max: addDays(date, horizonDays) };
}

export function isDateWithinRange(dateISO: string, range: { min: string; max: string }): boolean {
  return dateISO >= range.min && dateISO <= range.max;
}

/**
 * Все слоты дня с флагом доступности. Прошедшие (с учётом запаса leadMinutes)
 * и занятые слоты помечаются available: false, а не удаляются, чтобы UI мог их показать.
 * Для выходного дня возвращает пустой массив.
 */
export function generateDaySlots(branch: Branch, dateISO: string, options: SlotOptions): Slot[] {
  const {
    now,
    busy = [],
    slotMinutes = siteConfig.slotMinutes,
    leadMinutes = siteConfig.bookingLeadMinutes,
    timeZone = siteConfig.timeZone,
  } = options;

  const schedule = branch.schedule[weekdayOf(dateISO)];
  if (!schedule) return [];

  const busySet = new Set(busy);
  const current = nowInTimeZone(now, timeZone);

  // Минимально допустимое время старта для сегодняшнего дня; для прошлых дат — всё недоступно
  let minStart = -Infinity;
  if (dateISO === current.date) minStart = current.minutes + leadMinutes;
  else if (dateISO < current.date) minStart = Infinity;

  const slots: Slot[] = [];
  for (
    let start = schedule.open * 60;
    start + slotMinutes <= schedule.close * 60;
    start += slotMinutes
  ) {
    const time = minutesToTime(start);
    slots.push({ time, available: start >= minStart && !busySet.has(time) });
  }
  return slots;
}

export function isSlotAvailable(
  branch: Branch,
  dateISO: string,
  time: string,
  options: SlotOptions,
): boolean {
  return generateDaySlots(branch, dateISO, options).some((s) => s.time === time && s.available);
}
