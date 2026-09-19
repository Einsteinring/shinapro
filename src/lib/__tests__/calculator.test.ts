import { describe, expect, it } from "vitest";
import { pricing, type PricingConfig } from "@/config/pricing";
import {
  calculatePrice,
  createSnapshot,
  DEFAULT_CALCULATOR_INPUT,
  describeInput,
  getUnitPrice,
  normalizeInput,
  pluralWheels,
  roundTo,
  type CalculatorInput,
} from "@/lib/calculator";

/** Прайс с «круглыми» числами, чтобы ожидания в тестах считались в уме */
const testPricing: PricingConfig = {
  ...pricing,
  roundTo: 1,
  vehicle: {
    sedan: { label: "Легковой", shortLabel: "Легковой", hint: "", multiplier: 1 },
    suv: { label: "SUV", shortLabel: "SUV", hint: "", multiplier: 2 },
    minivan: { label: "Минивэн", shortLabel: "Минивэн", hint: "", multiplier: 3 },
    lcv: { label: "LCV", shortLabel: "LCV", hint: "", multiplier: 4 },
  },
  wheelType: {
    steel: { label: "Штамп", shortLabel: "Штамп", hint: "", multiplier: 1 },
    alloy: { label: "Литые", shortLabel: "Литые", hint: "", multiplier: 1.5 },
    lowprofile: { label: "Low", shortLabel: "Low", hint: "", multiplier: 2 },
  },
  perWheelByBand: {
    "r13-15": {
      removeInstall: 100,
      mountDemount: 200,
      balancing: 300,
      punctureRepair: 400,
      discRepair: 500,
    },
    "r16-17": {
      removeInstall: 110,
      mountDemount: 210,
      balancing: 310,
      punctureRepair: 410,
      discRepair: 510,
    },
    "r18-19": {
      removeInstall: 120,
      mountDemount: 220,
      balancing: 320,
      punctureRepair: 420,
      discRepair: 520,
    },
    "r20-22": {
      removeInstall: 130,
      mountDemount: 230,
      balancing: 330,
      punctureRepair: 430,
      discRepair: 530,
    },
  },
  perWheelFlat: { wash: 50, bags: 25 },
  storage: {
    ...pricing.storage,
    perWheelPerMonth: 10,
    longTermFrom: 6,
    longTermDiscountPercent: 10,
  },
  extras: {
    homeVisit: { ...pricing.extras.homeVisit, price: 1000 },
    urgent: { ...pricing.extras.urgent, percent: 50 },
  },
  complexDiscount: { label: "Комплекс", percent: 10, minWheels: 4 },
};

const noServices = {
  removeInstall: false,
  mountDemount: false,
  balancing: false,
  wash: false,
  bags: false,
};

const base: CalculatorInput = {
  vehicle: "sedan",
  radius: 14,
  wheelType: "steel",
  wheels: 4,
  services: { ...noServices },
  punctures: 0,
  discs: 0,
  storageMonths: 0,
  homeVisit: false,
  urgent: false,
};

describe("roundTo", () => {
  it("округляет до шага", () => {
    expect(roundTo(1234, 10)).toBe(1230);
    expect(roundTo(1235, 10)).toBe(1240);
    expect(roundTo(99, 50)).toBe(100);
  });
  it("при нулевом шаге округляет до целого", () => {
    expect(roundTo(12.6, 0)).toBe(13);
  });
});

describe("getUnitPrice", () => {
  it("берёт базу по диапазону радиуса", () => {
    expect(
      getUnitPrice(
        "removeInstall",
        { vehicle: "sedan", radius: 13, wheelType: "steel" },
        testPricing,
      ),
    ).toBe(100);
    expect(
      getUnitPrice(
        "removeInstall",
        { vehicle: "sedan", radius: 17, wheelType: "steel" },
        testPricing,
      ),
    ).toBe(110);
    expect(
      getUnitPrice(
        "removeInstall",
        { vehicle: "sedan", radius: 22, wheelType: "steel" },
        testPricing,
      ),
    ).toBe(130);
  });
  it("перемножает коэффициенты авто и дисков", () => {
    expect(
      getUnitPrice("balancing", { vehicle: "suv", radius: 14, wheelType: "alloy" }, testPricing),
    ).toBe(300 * 2 * 1.5);
  });
  it("округляет по roundTo из конфига", () => {
    // 200 × 1.1 = 220 → с шагом 50 будет 200
    expect(
      getUnitPrice(
        "mountDemount",
        { vehicle: "sedan", radius: 14, wheelType: "alloy" },
        { ...testPricing, roundTo: 50 },
      ),
    ).toBe(300);
  });
});

describe("calculatePrice", () => {
  it("возвращает 0 без выбранных услуг", () => {
    const r = calculatePrice(base, testPricing);
    expect(r.lines).toEqual([]);
    expect(r.subtotal).toBe(0);
    expect(r.total).toBe(0);
    expect(r.discounts).toEqual([]);
  });

  it("считает услуги за колесо × количество колёс", () => {
    const r = calculatePrice(
      { ...base, wheels: 2, services: { ...noServices, removeInstall: true, balancing: true } },
      testPricing,
    );
    expect(r.lines.map((l) => [l.id, l.qty, l.unitPrice, l.total])).toEqual([
      ["removeInstall", 2, 100, 200],
      ["balancing", 2, 300, 600],
    ]);
    expect(r.total).toBe(800);
  });

  it("не применяет коэффициенты к мойке и пакетам", () => {
    const r = calculatePrice(
      {
        ...base,
        vehicle: "lcv",
        wheelType: "lowprofile",
        services: { ...noServices, wash: true, bags: true },
      },
      testPricing,
    );
    expect(r.lines.find((l) => l.id === "wash")?.unitPrice).toBe(50);
    expect(r.lines.find((l) => l.id === "bags")?.unitPrice).toBe(25);
    expect(r.total).toBe((50 + 25) * 4);
  });

  it("считает ремонт проколов по количеству проколов, а не колёс", () => {
    const r = calculatePrice({ ...base, wheels: 1, punctures: 3 }, testPricing);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ id: "punctureRepair", qty: 3, unitPrice: 400, total: 1200 });
  });

  it("считает хранение как колёса × месяцы", () => {
    const r = calculatePrice({ ...base, wheels: 4, storageMonths: 3 }, testPricing);
    expect(r.lines[0]).toMatchObject({ id: "storage", qty: 12, unitPrice: 10, total: 120 });
    expect(r.discounts).toEqual([]);
  });

  it("даёт скидку на долгое хранение", () => {
    const r = calculatePrice({ ...base, wheels: 4, storageMonths: 6 }, testPricing);
    expect(r.subtotal).toBe(240);
    expect(r.discounts[0]).toMatchObject({ id: "storageLongTerm", amount: 24 });
    expect(r.total).toBe(216);
  });

  it("добавляет фиксированную цену выезда", () => {
    const r = calculatePrice({ ...base, homeVisit: true }, testPricing);
    expect(r.lines[0]).toMatchObject({ id: "homeVisit", qty: 1, total: 1000 });
    expect(r.total).toBe(1000);
  });

  it("даёт скидку за комплекс только при трёх услугах и 4 колёсах", () => {
    const full = { ...noServices, removeInstall: true, mountDemount: true, balancing: true };

    const complex = calculatePrice({ ...base, wheels: 4, services: full }, testPricing);
    expect(complex.subtotal).toBe((100 + 200 + 300) * 4);
    expect(complex.discounts).toEqual([{ id: "complex", label: "Комплекс", amount: 240 }]);
    expect(complex.total).toBe(2400 - 240);

    const threeWheels = calculatePrice({ ...base, wheels: 3, services: full }, testPricing);
    expect(threeWheels.discounts).toEqual([]);

    const noBalancing = calculatePrice(
      { ...base, wheels: 4, services: { ...full, balancing: false } },
      testPricing,
    );
    expect(noBalancing.discounts).toEqual([]);
  });

  it("скидка за комплекс не распространяется на мойку и выезд", () => {
    const r = calculatePrice(
      {
        ...base,
        services: {
          removeInstall: true,
          mountDemount: true,
          balancing: true,
          wash: true,
          bags: false,
        },
        homeVisit: true,
      },
      testPricing,
    );
    // комплекс: 2400, мойка 200, выезд 1000; скидка 10% только от 2400
    expect(r.discounts[0]?.amount).toBe(240);
    expect(r.total).toBe(2400 + 200 + 1000 - 240);
  });

  it("наценка за срочность считается после скидок", () => {
    const full = { ...noServices, removeInstall: true, mountDemount: true, balancing: true };
    const r = calculatePrice({ ...base, services: full, urgent: true }, testPricing);
    expect(r.urgencyFee).toBe((2400 - 240) * 0.5);
    expect(r.total).toBe(2160 + 1080);
  });

  it("применяет коэффициенты авто и дисков к работам, зависящим от радиуса", () => {
    const r = calculatePrice(
      {
        ...base,
        vehicle: "suv",
        wheelType: "alloy",
        wheels: 1,
        services: { ...noServices, mountDemount: true },
        punctures: 1,
      },
      testPricing,
    );
    expect(r.multipliers).toEqual({ vehicle: 2, wheelType: 1.5, combined: 3 });
    expect(r.lines.find((l) => l.id === "mountDemount")?.unitPrice).toBe(600);
    expect(r.lines.find((l) => l.id === "punctureRepair")?.unitPrice).toBe(1200);
  });

  it("никогда не даёт отрицательный итог", () => {
    const aggressive: PricingConfig = {
      ...testPricing,
      complexDiscount: { label: "x", percent: 500, minWheels: 4 },
    };
    const full = { ...noServices, removeInstall: true, mountDemount: true, balancing: true };
    const r = calculatePrice({ ...base, services: full }, aggressive);
    expect(r.total).toBe(0);
  });

  it("работает с реальным прайсом и даёт суммы, кратные roundTo", () => {
    const r = calculatePrice(DEFAULT_CALCULATOR_INPUT);
    expect(r.total).toBeGreaterThan(0);
    for (const line of r.lines) expect(line.unitPrice % pricing.roundTo).toBe(0);
    for (const d of r.discounts) expect(d.amount % pricing.roundTo).toBe(0);
    expect(r.total % pricing.roundTo).toBe(0);
  });

  it("сумма строк минус скидки плюс срочность равна total", () => {
    const r = calculatePrice(
      {
        vehicle: "minivan",
        radius: 19,
        wheelType: "lowprofile",
        wheels: 4,
        services: {
          removeInstall: true,
          mountDemount: true,
          balancing: true,
          wash: true,
          bags: true,
        },
        discs: 2,
        punctures: 2,
        storageMonths: 8,
        homeVisit: true,
        urgent: true,
      },
      pricing,
    );
    const linesSum = r.lines.reduce((s, l) => s + l.total, 0);
    const discountSum = r.discounts.reduce((s, d) => s + d.amount, 0);
    expect(r.subtotal).toBe(linesSum);
    expect(r.total).toBe(linesSum - discountSum + r.urgencyFee);
  });
});

describe("normalizeInput", () => {
  it("заполняет дефолтами пустой ввод", () => {
    expect(normalizeInput(undefined)).toEqual(DEFAULT_CALCULATOR_INPUT);
    expect(normalizeInput({})).toEqual(DEFAULT_CALCULATOR_INPUT);
  });

  it("отбрасывает неизвестные значения и приводит строки к числам", () => {
    const r = normalizeInput({ vehicle: "tank", radius: "18", wheels: "9", wheelType: "alloy" });
    expect(r.vehicle).toBe("sedan");
    expect(r.radius).toBe(18);
    expect(r.wheels).toBe(4);
    expect(r.wheelType).toBe("alloy");
  });

  it("обрезает проколы и месяцы по максимуму из конфига", () => {
    const r = normalizeInput({ punctures: 99, storageMonths: -3 });
    expect(r.punctures).toBe(pricing.puncture.max);
    expect(r.storageMonths).toBe(0);
  });

  it("булевы поля принимает только как true", () => {
    const r = normalizeInput({ homeVisit: "1", urgent: true });
    expect(r.homeVisit).toBe(false);
    expect(r.urgent).toBe(true);
  });
});

describe("snapshot и описание", () => {
  it("склоняет «колесо»", () => {
    expect(pluralWheels(1)).toBe("колесо");
    expect(pluralWheels(2)).toBe("колеса");
    expect(pluralWheels(4)).toBe("колеса");
    expect(pluralWheels(5)).toBe("колёс");
  });

  it("описывает параметры человеческим языком", () => {
    expect(
      describeInput({ ...DEFAULT_CALCULATOR_INPUT, vehicle: "suv", radius: 17, wheels: 1 }),
    ).toBe("Кроссовер / SUV, R17, литые, 1 колесо");
  });

  it("создаёт снимок расчёта c нормализованным входом", () => {
    const snap = createSnapshot({ ...DEFAULT_CALCULATOR_INPUT, punctures: 100 });
    expect(snap.input.punctures).toBe(pricing.puncture.max);
    expect(snap.total).toBe(calculatePrice(snap.input).total);
    expect(snap.lines.length).toBeGreaterThan(0);
    expect(snap.summary).toContain("R16");
  });
});
