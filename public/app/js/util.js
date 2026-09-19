/**
 * Даты, телефон и мелкие помощники DOM.
 * Даты везде в формате YYYY-MM-DD и считаются через Date.UTC, чтобы часовой пояс
 * устройства не сдвигал календарь. «Сейчас» переводим в пояс филиала через Intl.
 */

const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function toISODate(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonths(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function weekdayOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Текущие дата и минуты с начала суток в часовом поясе филиала */
export function nowInZone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { date: toISODate(get("year"), get("month"), get("day")), minutes: get("hour") * 60 + get("minute") };
}

export function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Все времена рабочего дня: 09:00, 09:30, … 20:30.
 * Часы приходят из графика филиала как числа (9 и 21), у каждого дня недели свои.
 */
export function daySlots(hours, slotMinutes) {
  const out = [];
  for (let t = hours.open * 60; t + slotMinutes <= hours.close * 60; t += slotMinutes) {
    out.push(minutesToTime(t));
  }
  return out;
}

/** График филиала на конкретную дату; null — выходной */
export function hoursFor(branch, date) {
  return branch.schedule[String(weekdayOf(date))] ?? null;
}

/** «суббота, 20 сентября» */
export function formatDateRu(iso, { weekday = true } = {}) {
  const [, m, d] = iso.split("-").map(Number);
  const base = `${d} ${MONTHS_GEN[m - 1]}`;
  return weekday ? `${WEEKDAYS[weekdayOf(iso)]}, ${base}` : base;
}

/** «20 сент.» — для карточек записей и периода хранения */
export function formatDateShortRu(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function weekdayShort(iso) {
  return WEEKDAYS_SHORT[weekdayOf(iso)];
}

export function monthShort(iso) {
  return MONTHS_SHORT[Number(iso.split("-")[1]) - 1];
}

export function dayNumber(iso) {
  return Number(iso.split("-")[2]);
}

/* ---------- телефон ---------- */

export const PHONE_PLACEHOLDER = "+7 (___) ___-__-__";

export function phoneDigits(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("7") || digits.startsWith("8")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function formatPhone(raw) {
  const d = phoneDigits(raw);
  if (!d) return "";
  let out = "+7 (" + d.slice(0, 3);
  if (d.length >= 3) out += ") ";
  if (d.length > 3) out += d.slice(3, 6);
  if (d.length >= 6) out += "-";
  if (d.length > 6) out += d.slice(6, 8);
  if (d.length >= 8) out += "-";
  if (d.length > 8) out += d.slice(8, 10);
  return out;
}

export function isPhoneComplete(raw) {
  return phoneDigits(raw).length === 10;
}

export function normalizePhone(raw) {
  return `+7${phoneDigits(raw)}`;
}

/* ---------- DOM ---------- */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
