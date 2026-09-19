/**
 * Расчёт стоимости на экране.
 *
 * Это зеркало src/lib/calculator.ts: те же работы, тот же порядок строк, то же
 * округление. Прайс не хранится здесь вовсе — он приходит из /api/miniapp/pricing,
 * то есть из src/config/pricing.ts, того же файла, по которому считает калькулятор
 * на главной сайта.
 *
 * Зачем тогда вторая реализация: сумма должна меняться в том же кадре, что и
 * параметр, без похода на сервер. За тем, чтобы обе считали одинаково, следит
 * src/lib/__tests__/miniapp-parity.test.ts — он прогоняет через них все комбинации.
 * Итог заявки в любом случае берётся с сервера: здесь считается то, что видно,
 * а не то, что сохранится.
 */

let P = null;

export function setPricing(data) {
  P = data;
}

export function pricing() {
  if (!P) throw new Error("Прайс ещё не загружен");
  return P;
}

export function roundTo(value, step) {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function bandOf(radius) {
  const band = P.bands.find((b) => b.radii.includes(Number(radius)));
  if (!band) throw new Error(`Нет диапазона цен для R${radius}`);
  return band.id;
}

export function getService(id) {
  return P.services.find((s) => s.id === id) ?? P.services[0];
}

export function getUnit(service) {
  return P.units[service.unit];
}

export function getBranch(id) {
  return P.branches.find((b) => b.id === id) ?? P.branches[0];
}

function optionOf(list, id) {
  return list.find((x) => x.id === id) ?? list[0];
}

export function labelOf(list, id) {
  return optionOf(list, id).label;
}

export function fullLabelOf(list, id) {
  const item = optionOf(list, id);
  return item.fullLabel ?? item.label;
}

/** Цена одной единицы работы, зависящей от радиуса, с коэффициентами авто и дисков */
export function unitPrice(workId, input) {
  const base = P.perWheelByBand[bandOf(input.radius)][workId];
  const multiplier =
    optionOf(P.vehicle, input.vehicle).multiplier * optionOf(P.wheelType, input.wheelType).multiplier;
  return roundTo(base * multiplier, P.roundTo);
}

/**
 * Полный расчёт заказа. Порядок строк и скидок повторяет calculatePrice на сервере:
 * работы «за колесо», затем проколы, затем диски, затем хранение.
 */
export function calculate(input) {
  const service = getService(input.service);
  const unit = getUnit(service);
  const count = Math.min(Math.max(1, Number(input.count) || 1), unit.max);
  const lines = [];
  const discounts = [];

  const addLine = (id, label, qty, unitLabel, price) => {
    if (qty <= 0 || price <= 0) return;
    lines.push({ id, label, qty, unit: unitLabel, unitPrice: price, total: price * qty });
  };

  if (service.storage) {
    const months = pickMonths(service, input.months);
    const qty = count * months;
    // Хранение не зависит ни от машины, ни от дисков: место на стеллаже определяет колесо
    addLine(
      "storage",
      `${P.storage.label}, ${months} мес.`,
      qty,
      "колесо × мес.",
      P.storage.perWheelPerMonth,
    );
    if (months >= P.storage.longTermFrom) {
      const storageTotal = qty * P.storage.perWheelPerMonth;
      discounts.push({
        id: "storageLongTerm",
        label: `Скидка за хранение от ${P.storage.longTermFrom} мес. (${P.storage.longTermDiscountPercent}%)`,
        amount: roundTo((storageTotal * P.storage.longTermDiscountPercent) / 100, P.roundTo),
      });
    }
  } else if (service.unit === "puncture") {
    addLine("punctureRepair", P.works.punctureRepair, count, "прокол", unitPrice("punctureRepair", input));
  } else if (service.unit === "disc") {
    addLine("discRepair", P.works.discRepair, count, "диск", unitPrice("discRepair", input));
  } else {
    for (const workId of service.works) {
      addLine(workId, P.works[workId], count, "колесо", unitPrice(workId, input));
    }
    // Условие скидки повторяет calculatePrice: комплекс — это все три работы сразу
    const complex = P.complexDiscount;
    const isComplex = ["removeInstall", "mountDemount", "balancing"].every((w) =>
      service.works.includes(w),
    );
    if (isComplex && count >= complex.minWheels) {
      const base = lines.reduce((sum, l) => sum + l.total, 0);
      discounts.push({
        id: "complex",
        label: complex.label,
        amount: roundTo((base * complex.percent) / 100, P.roundTo),
      });
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  return { lines, discounts, subtotal, total: Math.max(0, subtotal - discountTotal) };
}

export function pickMonths(service, months) {
  if (!service.storage) return 0;
  return service.months.includes(Number(months)) ? Number(months) : service.defaultMonths;
}

export function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function pluralMonths(n) {
  return plural(n, ["месяц", "месяца", "месяцев"]);
}

/** «2 740 ₽» — узкий неразрывный пробел, чтобы сумма не разрывалась переносом */
export function formatPrice(value) {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/\u00a0/g, "\u202f")}\u202f${P?.currency ?? "₽"}`;
}

/** Короткое описание параметров для сводки на экране подтверждения */
export function describe(input) {
  const service = getService(input.service);
  const unit = getUnit(service);
  const parts = [];

  if (!service.storage) {
    parts.push(fullLabelOf(P.vehicle, input.vehicle));
    parts.push(`R${input.radius}`);
    parts.push(labelOf(P.wheelType, input.wheelType).toLowerCase());
  } else {
    parts.push(`R${input.radius}`);
  }

  // Неразрывный пробел: «4 колеса» не должно разрываться переносом строки
  parts.push(`${input.count}\u00a0${plural(input.count, unit.forms)}`);
  if (service.storage) {
    const months = pickMonths(service, input.months);
    parts.push(`${months}\u00a0${pluralMonths(months)}`);
  }
  return parts.join(", ");
}
