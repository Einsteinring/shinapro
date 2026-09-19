/**
 * Хранилище демо-режима: то же, что делает база на сервере, только в памяти вкладки.
 *
 * Занятость слотов не случайная, а выведена из филиала, даты и времени — при
 * перезагрузке сетка выглядит одинаково, и состояние «занято» видно сразу,
 * без предварительной записи. Выходные берутся из настоящего графика филиала.
 */
import { addMonths, daySlots, hoursFor } from "./util.js";
import { calculate, describe, getBranch, getService, pickMonths } from "./pricing.js";

/** FNV-1a: детерминированное число 0..1 из строки */
function hash01(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return (x >>> 0) / 4294967296;
}

const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34789";

const bookings = new Map();
const taken = new Set(); // "branch|YYYY-MM-DD|14:30"
let nextId = 1;

/** Задержка, чтобы скелетоны и showProgress были видны, как на живом сервере */
const latency = () => new Promise((r) => setTimeout(r, 340 + Math.random() * 220));

export function createDemoStore(pricingData) {
  const schedule = pricingData.schedule;
  const horizon = (from) => {
    const out = [];
    for (let i = 0; i < schedule.horizonDays; i += 1) out.push(shift(from, i));
    return out;
  };

  function slotsOf(branch, date) {
    const hours = hoursFor(branch, date);
    return hours ? daySlots(hours, schedule.slotMinutes) : [];
  }

  function seededBusy(branchId, date, time) {
    if (taken.has(`${branchId}|${date}|${time}`)) return true;
    // Один день из примерно двенадцати занят целиком — чтобы «мест нет» было видно в демо
    if (hash01(`${branchId}${date}`) < 0.08) return true;
    // К вечеру записываются охотнее, чем с утра: занятость растёт к концу дня
    const hour = Number(time.slice(0, 2));
    const pressure = 0.2 + ((hour - 9) / 12) * 0.4;
    return hash01(`${branchId}|${date}|${time}`) < pressure;
  }

  function code() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  }

  return {
    async schedule(branchId) {
      await latency();
      const branch = getBranch(branchId);
      const today = todayInZone(schedule.timeZone);
      const busy = {};
      const closed = [];
      for (const date of horizon(today)) {
        const times = slotsOf(branch, date);
        if (times.length === 0) {
          closed.push(date);
          busy[date] = [];
          continue;
        }
        busy[date] = times.filter((t) => seededBusy(branchId, date, t));
      }
      return { busy, closed };
    },

    async book(order) {
      await latency();
      const service = getService(order.service);
      if (!service.storage && seededBusy(order.branchId, order.date, order.time)) {
        const error = new Error("Этот слот заняли, пока вы выбирали. Ниже — что осталось свободным");
        error.code = "slot_taken";
        throw error;
      }
      if (!service.storage) taken.add(`${order.branchId}|${order.date}|${order.time}`);

      const months = service.storage ? pickMonths(service, order.months) : 0;
      const id = nextId++;
      const booking = {
        id,
        number: `SP-${String(id).padStart(5, "0")}`,
        service: service.id,
        serviceTitle: service.title,
        branchId: order.branchId,
        date: order.date,
        time: service.storage ? null : order.time,
        until: service.storage ? addMonths(order.date, months) : null,
        months,
        name: order.name,
        phone: order.phone,
        total: calculate(order).total,
        summary: `${service.title} · ${describe(order)}`,
        status: "new",
        code: code(),
      };
      bookings.set(id, booking);
      return booking;
    },

    async mine() {
      await latency();
      return [...bookings.values()]
        .filter((b) => b.status !== "cancelled")
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
    },

    async cancel(id) {
      await latency();
      const booking = bookings.get(id);
      if (!booking) {
        const error = new Error("Запись не найдена — возможно, её уже отменили");
        error.code = "not_found";
        throw error;
      }
      booking.status = "cancelled";
      if (booking.time) taken.delete(`${booking.branchId}|${booking.date}|${booking.time}`);
      return { ok: true, booking };
    },

    /** Только для самопроверки: занять слот «чужой» записью, не создавая свою */
    _occupy(branchId, date, time) {
      taken.add(`${branchId}|${date}|${time}`);
    },
  };
}

function todayInZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

function shift(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}
