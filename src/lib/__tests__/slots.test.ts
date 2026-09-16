import { describe, expect, it } from "vitest";
import { branches } from "@/config/site";
import {
  generateDaySlots,
  getBookingDateRange,
  isBranchOpenOn,
  isSlotAvailable,
} from "@/lib/slots";

const tipanova = branches[0]!; // ежедневно 09:00–21:00
const bogatyrsky = branches[1]!; // Пн–Пт 09–20, Сб 10–18, Вс выходной

/** 2026-09-16 — среда. 12:00 по Москве = 09:00 UTC */
const wednesdayNoonMsk = new Date("2026-09-16T09:00:00Z");

describe("isBranchOpenOn", () => {
  it("учитывает выходные по графику филиала", () => {
    expect(isBranchOpenOn(tipanova, "2026-09-20")).toBe(true); // воскресенье
    expect(isBranchOpenOn(bogatyrsky, "2026-09-20")).toBe(false);
    expect(isBranchOpenOn(bogatyrsky, "2026-09-19")).toBe(true); // суббота
  });
});

describe("getBookingDateRange", () => {
  it("считает «сегодня» по часовому поясу филиала", () => {
    // 23:30 UTC 16 сентября = 02:30 МСК 17 сентября
    const range = getBookingDateRange(new Date("2026-09-16T23:30:00Z"), 30);
    expect(range.min).toBe("2026-09-17");
    expect(range.max).toBe("2026-10-17");
  });
});

describe("generateDaySlots", () => {
  it("строит слоты с шагом 30 минут внутри графика", () => {
    const slots = generateDaySlots(tipanova, "2026-09-18", { now: wednesdayNoonMsk });
    expect(slots).toHaveLength(24); // 12 часов × 2
    expect(slots[0]?.time).toBe("09:00");
    expect(slots.at(-1)?.time).toBe("20:30");
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("возвращает пустой массив в выходной", () => {
    expect(generateDaySlots(bogatyrsky, "2026-09-20", { now: wednesdayNoonMsk })).toEqual([]);
  });

  it("использует укороченный график субботы", () => {
    const slots = generateDaySlots(bogatyrsky, "2026-09-19", { now: wednesdayNoonMsk });
    expect(slots[0]?.time).toBe("10:00");
    expect(slots.at(-1)?.time).toBe("17:30");
  });

  it("сегодня скрывает прошедшие слоты с учётом запаса", () => {
    const slots = generateDaySlots(tipanova, "2026-09-16", {
      now: wednesdayNoonMsk,
      leadMinutes: 60,
    });
    const firstAvailable = slots.find((s) => s.available);
    expect(firstAvailable?.time).toBe("13:00");
    expect(slots.find((s) => s.time === "12:30")?.available).toBe(false);
  });

  it("на прошлую дату все слоты недоступны", () => {
    const slots = generateDaySlots(tipanova, "2026-09-15", { now: wednesdayNoonMsk });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.available)).toBe(false);
  });

  it("помечает занятые слоты", () => {
    const slots = generateDaySlots(tipanova, "2026-09-18", {
      now: wednesdayNoonMsk,
      busy: ["10:00", "10:30"],
    });
    expect(slots.find((s) => s.time === "10:00")?.available).toBe(false);
    expect(slots.find((s) => s.time === "10:30")?.available).toBe(false);
    expect(slots.find((s) => s.time === "11:00")?.available).toBe(true);
  });

  it("isSlotAvailable отвергает время вне графика и занятое", () => {
    const opts = { now: wednesdayNoonMsk, busy: ["15:00"] };
    expect(isSlotAvailable(tipanova, "2026-09-18", "15:00", opts)).toBe(false);
    expect(isSlotAvailable(tipanova, "2026-09-18", "15:30", opts)).toBe(true);
    expect(isSlotAvailable(tipanova, "2026-09-18", "21:00", opts)).toBe(false);
    expect(isSlotAvailable(tipanova, "2026-09-18", "15:15", opts)).toBe(false);
  });
});
