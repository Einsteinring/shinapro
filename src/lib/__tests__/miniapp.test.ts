/**
 * Каталог Mini App и его перевод во вход калькулятора сайта.
 * Здесь проверяется, что «сезонная замена комплекта» — это действительно
 * снятие + монтаж + балансировка, а не отдельная услуга со своей ценой.
 */
import { describe, expect, it } from "vitest";
import {
  MINIAPP_SERVICES,
  OrderValidationError,
  describeOrder,
  miniappOrderSchema,
  miniappPricingPayload,
  publicBooking,
  toCalculatorInput,
  validateOrder,
  type MiniappOrder,
} from "@/lib/miniapp";
import { buildSnapshot } from "@/lib/miniapp";

function order(overrides: Partial<MiniappOrder> = {}): MiniappOrder {
  return {
    service: "seasonal",
    branchId: "moskovskaya",
    radius: 16,
    vehicle: "sedan",
    wheelType: "alloy",
    count: 4,
    months: 0,
    date: "2026-10-01",
    time: "12:00",
    name: "Иван",
    phone: "+79219998877",
    ...overrides,
  } as MiniappOrder;
}

describe("перевод заказа в калькулятор сайта", () => {
  it("сезонная замена — это три работы прайса", () => {
    const input = toCalculatorInput(order());
    expect(input.services).toMatchObject({
      removeInstall: true,
      mountDemount: true,
      balancing: true,
      wash: false,
      bags: false,
    });
    expect(input.wheels).toBe(4);
  });

  it("балансировка и снятие включают только свою работу", () => {
    expect(toCalculatorInput(order({ service: "balancing" })).services.balancing).toBe(true);
    expect(toCalculatorInput(order({ service: "balancing" })).services.removeInstall).toBe(false);
    expect(toCalculatorInput(order({ service: "removeInstall" })).services.mountDemount).toBe(
      false,
    );
  });

  it("проколы и диски идут в свои поля, а не в колёса", () => {
    expect(toCalculatorInput(order({ service: "puncture", count: 3 })).punctures).toBe(3);
    expect(toCalculatorInput(order({ service: "discRepair", count: 2 })).discs).toBe(2);
    expect(toCalculatorInput(order({ service: "puncture", count: 3 })).discs).toBe(0);
  });

  it("хранение переносит срок в месяцы", () => {
    const input = toCalculatorInput(order({ service: "storage", months: 6, count: 4, time: null }));
    expect(input.storageMonths).toBe(6);
    expect(input.wheels).toBe(4);
  });
});

describe("проверки смысла заказа", () => {
  it("не даёт заказать больше проколов, чем умеет прайс", () => {
    expect(() => validateOrder(order({ service: "puncture", count: 8 }))).not.toThrow();
    expect(() => validateOrder(order({ service: "discRepair", count: 8 }))).toThrow(
      OrderValidationError,
    );
  });

  it("у хранения не бывает времени визита, у остальных услуг оно обязательно", () => {
    expect(() => validateOrder(order({ service: "storage", months: 6, time: "12:00" }))).toThrow(
      /не бронируется время/,
    );
    expect(() => validateOrder(order({ time: null }))).toThrow(/Не выбрано время/);
  });

  it("срок хранения выбирается только из списка", () => {
    expect(() => validateOrder(order({ service: "storage", months: 7, time: null }))).toThrow(
      /срок хранения/,
    );
    expect(() => validateOrder(order({ service: "storage", months: 6, time: null }))).not.toThrow();
  });

  it("схема отсекает чужие значения", () => {
    expect(miniappOrderSchema.safeParse({ ...order(), radius: 23 }).success).toBe(false);
    expect(miniappOrderSchema.safeParse({ ...order(), branchId: "berlin" }).success).toBe(false);
    expect(miniappOrderSchema.safeParse({ ...order(), phone: "89219998877" }).success).toBe(false);
    expect(miniappOrderSchema.safeParse({ ...order(), name: "И" }).success).toBe(false);
    expect(miniappOrderSchema.safeParse(order()).success).toBe(true);
  });

  it("присланная клиентом сумма в заказ не попадает", () => {
    const parsed = miniappOrderSchema.parse({ ...order(), total: 1, price: 1 });
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("price");
  });
});

describe("сводка заявки", () => {
  it("начинается с услуги и перечисляет выбранное", () => {
    expect(describeOrder(order({ radius: 18, vehicle: "suv", wheelType: "lowprofile" }))).toBe(
      "Сезонная замена комплекта · Кроссовер / SUV, R18, run-flat, 4 колеса",
    );
  });

  it("у хранения не показывает то, чего не спрашивали", () => {
    const text = describeOrder(
      order({ service: "storage", months: 6, time: null, vehicle: "lcv" }),
    );
    expect(text).toBe("Сезонное хранение шин · R16, 4 колеса, 6 месяцев");
    expect(text).not.toContain("Лёгкий");
  });
});

describe("прайс для клиента", () => {
  it("содержит оба филиала с графиком", () => {
    const payload = miniappPricingPayload();
    expect(payload.branches).toHaveLength(2);
    expect(payload.branches[0]?.schedule[1]).toEqual({ open: 9, close: 21 });
    // У Богатырского воскресенье выходной — это должно доехать до календаря
    expect(payload.branches[1]?.schedule[0]).toBeNull();
  });

  it("перечисляет все услуги Mini App с ценой «от»", () => {
    const payload = miniappPricingPayload();
    expect(payload.services).toHaveLength(MINIAPP_SERVICES.length);
    expect(payload.services.find((s) => s.id === "seasonal")?.priceFromLabel).toBe(
      "от 550 ₽ за колесо",
    );
    expect(payload.services.find((s) => s.id === "discRepair")?.priceFromLabel).toBe(
      "от 900 ₽ за диск",
    );
  });

  it("горизонт записи один на сайт и приложение", () => {
    expect(miniappPricingPayload().schedule.horizonDays).toBe(30);
  });
});

describe("ответ клиенту", () => {
  it("собирает дату выдачи шин из снимка расчёта", () => {
    const value = order({ service: "storage", months: 6, time: null, date: "2026-10-01" });
    const row = {
      id: 42,
      service: "storage",
      branchId: "moskovskaya",
      date: "2026-10-01",
      time: null,
      name: "Иван",
      phone: "+79219998877",
      calcTotal: buildSnapshot(value).total,
      calculation: JSON.stringify(buildSnapshot(value)),
      status: "new",
    };
    const result = publicBooking(row);
    expect(result.number).toBe("SP-00042");
    expect(result.until).toBe("2027-04-01");
    expect(result.months).toBe(6);
    expect(result.serviceTitle).toBe("Сезонное хранение шин");
  });

  it("не падает на битом снимке расчёта", () => {
    const result = publicBooking({
      id: 1,
      service: "seasonal",
      branchId: "moskovskaya",
      date: "2026-10-01",
      time: "12:00",
      name: "Иван",
      phone: "+79219998877",
      calcTotal: 2740,
      calculation: "{не json",
      status: "new",
    });
    expect(result.total).toBe(2740);
    expect(result.until).toBeNull();
  });
});
