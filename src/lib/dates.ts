/**
 * Работа с датами в формате YYYY-MM-DD без привязки к часовому поясу сервера.
 * Все «календарные» операции делаем через Date.UTC, а «сейчас» переводим
 * в часовой пояс филиала через Intl.
 */
import type { Weekday } from "@/config/site";

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function weekdayOf(iso: string): Weekday {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Прибавляет месяцы, прижимая к концу месяца: 31 января + 1 месяц = 28 февраля */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay)));
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function compareISODates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface ZonedNow {
  /** Локальная дата, YYYY-MM-DD */
  date: string;
  /** Минут с начала локальных суток */
  minutes: number;
}

/** Текущие дата и время в заданном часовом поясе */
export function nowInTimeZone(now: Date, timeZone: string): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    date: toISODate(get("year"), get("month"), get("day")),
    minutes: get("hour") * 60 + get("minute"),
  };
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];
const MONTHS_RU_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** «суббота, 20 сентября» */
export function formatDateRu(
  iso: string,
  options: { weekday?: boolean; year?: boolean } = {},
): string {
  const { weekday = true, year = false } = options;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const base = `${d} ${MONTHS_RU_GENITIVE[m - 1]}${year ? ` ${y}` : ""}`;
  return weekday ? `${WEEKDAYS_RU[weekdayOf(iso)]}, ${base}` : base;
}

/** «20.09.2026» */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function formatDateTimeRu(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
