/**
 * Сходимость расчёта на экране и на сервере.
 *
 * Сумма, которую человек видит в Mini App, считается в браузере (public/app/js/pricing.js),
 * а сумма, которая уходит в заявку, — на сервере (src/lib/calculator.ts). Реализации разные,
 * прайс один. Этот тест прогоняет через обе все комбинации услуг, радиусов, типов авто,
 * дисков, количества и сроков и требует совпадения до рубля — вплоть до подписей строк,
 * потому что расшифровку из заявки видит и клиент, и админка.
 */
import { describe, expect, it } from "vitest";
import { RADII, VEHICLE_TYPES, WHEEL_TYPES } from "@/config/pricing";
import { calculatePrice } from "@/lib/calculator";
import {
  MINIAPP_SERVICES,
  MINIAPP_UNITS,
  miniappPricingPayload,
  toCalculatorInput,
  type MiniappOrder,
} from "@/lib/miniapp";

// Тот же модуль, что грузит браузер: правка в нём сразу отражается на тесте
const client = await import("../../../public/app/js/pricing.js");

client.setPricing(miniappPricingPayload());

function order(overrides: Partial<MiniappOrder>): MiniappOrder {
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

describe("расчёт в браузере и на сервере", () => {
  const combinations: MiniappOrder[] = [];
  for (const service of MINIAPP_SERVICES) {
    const unit = MINIAPP_UNITS[service.unit];
    const monthsList = service.storage ? (service.months ?? [0]) : [0];
    for (const radius of RADII) {
      for (const vehicle of VEHICLE_TYPES) {
        for (const wheelType of WHEEL_TYPES) {
          for (let count = 1; count <= unit.max; count += 1) {
            for (const months of monthsList) {
              combinations.push(
                order({ service: service.id, radius, vehicle, wheelType, count, months }),
              );
            }
          }
        }
      }
    }
  }

  it("перебирает все сочетания параметров", () => {
    expect(combinations.length).toBeGreaterThan(2500);
  });

  it("совпадает до рубля на каждом сочетании", () => {
    const mismatches: string[] = [];

    for (const value of combinations) {
      const server = calculatePrice(toCalculatorInput(value));
      const browser = client.calculate({
        service: value.service,
        radius: value.radius,
        vehicle: value.vehicle,
        wheelType: value.wheelType,
        count: value.count,
        months: value.months,
      });

      const key = [
        value.service,
        value.radius,
        value.vehicle,
        value.wheelType,
        value.count,
        value.months,
      ].join("|");
      const serverShape = {
        total: server.total,
        subtotal: server.subtotal,
        lines: server.lines.map((l) => [l.id, l.label, l.qty, l.unit, l.unitPrice, l.total]),
        discounts: server.discounts.map((d) => [d.id, d.label, d.amount]),
      };
      const browserShape = {
        total: browser.total,
        subtotal: browser.subtotal,
        lines: browser.lines.map((l: Record<string, unknown>) => [
          l.id,
          l.label,
          l.qty,
          l.unit,
          l.unitPrice,
          l.total,
        ]),
        discounts: browser.discounts.map((d: Record<string, unknown>) => [d.id, d.label, d.amount]),
      };

      if (JSON.stringify(serverShape) !== JSON.stringify(browserShape)) {
        mismatches.push(
          `${key}\n  сервер:  ${JSON.stringify(serverShape)}\n  браузер: ${JSON.stringify(browserShape)}`,
        );
      }
    }

    expect(mismatches.slice(0, 3).join("\n"), `расхождений: ${mismatches.length}`).toBe("");
  });
});

describe("опорные цифры прайса", () => {
  it("комплекс на четырёх литых R16 стоит 2 740 ₽, как на главной сайта", () => {
    expect(calculatePrice(toCalculatorInput(order({}))).total).toBe(2740);
    expect(
      client.calculate({
        service: "seasonal",
        radius: 16,
        vehicle: "sedan",
        wheelType: "alloy",
        count: 4,
        months: 0,
      }).total,
    ).toBe(2740);
  });

  it("правка диска R20 считается по своей таблице", () => {
    const value = order({ service: "discRepair", radius: 20, wheelType: "steel", count: 1 });
    expect(calculatePrice(toCalculatorInput(value)).total).toBe(1800);
  });

  it("хранение не зависит от машины и дисков", () => {
    const cheap = order({ service: "storage", months: 1, vehicle: "sedan", wheelType: "steel" });
    const rich = order({ service: "storage", months: 1, vehicle: "lcv", wheelType: "lowprofile" });
    expect(calculatePrice(toCalculatorInput(cheap)).total).toBe(
      calculatePrice(toCalculatorInput(rich)).total,
    );
  });
});
