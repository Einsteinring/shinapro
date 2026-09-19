/**
 * Логика калькулятора стоимости. Только чистые функции: никаких React, DOM и I/O.
 * Все цены приходят из конфига (по умолчанию src/config/pricing.ts), поэтому
 * тесты могут подставить свой прайс, а владелец менять цены без правки этого файла.
 */
import {
  getRadiusBand,
  PER_WHEEL_SERVICES,
  pricing as defaultPricing,
  RADII,
  VEHICLE_TYPES,
  WHEEL_COUNTS,
  WHEEL_TYPES,
  type PerWheelService,
  type PricingConfig,
  type Radius,
  type RadiusPricedWork,
  type VehicleType,
  type WheelCount,
  type WheelType,
} from "@/config/pricing";

export interface CalculatorInput {
  vehicle: VehicleType;
  radius: Radius;
  wheelType: WheelType;
  wheels: WheelCount;
  services: Record<PerWheelService, boolean>;
  /** Количество проколов, 0 — услуга не нужна */
  punctures: number;
  /** Количество дисков на правку, 0 — услуга не нужна */
  discs: number;
  /** Срок хранения в месяцах, 0 — хранение не нужно */
  storageMonths: number;
  homeVisit: boolean;
  urgent: boolean;
}

export interface PriceLine {
  id: string;
  label: string;
  qty: number;
  /** Единица: «колесо», «прокол», «колесо × мес.» */
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Discount {
  id: string;
  label: string;
  /** Положительное число, вычитается из суммы */
  amount: number;
}

export interface CalculatorResult {
  lines: PriceLine[];
  /** Сумма всех строк до скидок и наценок */
  subtotal: number;
  discounts: Discount[];
  /** Наценка за срочность, считается после скидок */
  urgencyFee: number;
  total: number;
  multipliers: { vehicle: number; wheelType: number; combined: number };
}

export const DEFAULT_CALCULATOR_INPUT: CalculatorInput = {
  vehicle: "sedan",
  radius: 16,
  wheelType: "alloy",
  wheels: 4,
  services: {
    removeInstall: true,
    mountDemount: true,
    balancing: true,
    wash: false,
    bags: false,
  },
  punctures: 0,
  discs: 0,
  storageMonths: 0,
  homeVisit: false,
  urgent: false,
};

/** Округление до шага (10 ₽ по умолчанию), чтобы в чеке не было копеек и «1 234 ₽» */
export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function pickEnum<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

/**
 * Приводит произвольные данные (из URL, localStorage, формы) к валидному входу калькулятора.
 * Неизвестные и выходящие за пределы значения заменяются дефолтами или обрезаются.
 */
export function normalizeInput(
  partial: Partial<CalculatorInput> | Record<string, unknown> | null | undefined,
  config: PricingConfig = defaultPricing,
): CalculatorInput {
  const p = (partial ?? {}) as Partial<Record<keyof CalculatorInput, unknown>>;
  const rawServices = (p.services ?? {}) as Partial<Record<PerWheelService, unknown>>;

  const services = Object.fromEntries(
    PER_WHEEL_SERVICES.map((id) => [
      id,
      typeof rawServices[id] === "boolean"
        ? rawServices[id]
        : DEFAULT_CALCULATOR_INPUT.services[id],
    ]),
  ) as Record<PerWheelService, boolean>;

  const radiusNum = typeof p.radius === "string" ? Number(p.radius) : p.radius;
  const wheelsNum = typeof p.wheels === "string" ? Number(p.wheels) : p.wheels;

  return {
    vehicle: pickEnum(p.vehicle, VEHICLE_TYPES, DEFAULT_CALCULATOR_INPUT.vehicle),
    radius: pickEnum(radiusNum, RADII, DEFAULT_CALCULATOR_INPUT.radius),
    wheelType: pickEnum(p.wheelType, WHEEL_TYPES, DEFAULT_CALCULATOR_INPUT.wheelType),
    wheels: pickEnum(wheelsNum, WHEEL_COUNTS, DEFAULT_CALCULATOR_INPUT.wheels),
    services,
    punctures: clampInt(p.punctures, 0, config.puncture.max, 0),
    discs: clampInt(p.discs, 0, config.discRepair.max, 0),
    storageMonths: clampInt(p.storageMonths, 0, config.storage.maxMonths, 0),
    homeVisit: p.homeVisit === true,
    urgent: p.urgent === true,
  };
}

/** Цена за одно колесо для работ, зависящих от радиуса, с учётом коэффициентов авто и дисков */
export function getUnitPrice(
  work: RadiusPricedWork,
  input: Pick<CalculatorInput, "vehicle" | "radius" | "wheelType">,
  config: PricingConfig = defaultPricing,
): number {
  const base = config.perWheelByBand[getRadiusBand(input.radius).id][work];
  const multiplier =
    config.vehicle[input.vehicle].multiplier * config.wheelType[input.wheelType].multiplier;
  return roundTo(base * multiplier, config.roundTo);
}

export function calculatePrice(
  rawInput: CalculatorInput,
  config: PricingConfig = defaultPricing,
): CalculatorResult {
  const input = normalizeInput(rawInput, config);
  const lines: PriceLine[] = [];
  const discounts: Discount[] = [];
  const { wheels } = input;

  const vehicleMultiplier = config.vehicle[input.vehicle].multiplier;
  const wheelTypeMultiplier = config.wheelType[input.wheelType].multiplier;

  const addLine = (id: string, label: string, qty: number, unit: string, unitPrice: number) => {
    if (qty <= 0 || unitPrice <= 0) return;
    lines.push({ id, label, qty, unit, unitPrice, total: unitPrice * qty });
  };

  // Работы «за колесо», зависящие от радиуса
  const radiusPriced = ["removeInstall", "mountDemount", "balancing"] as const;
  for (const id of radiusPriced) {
    if (input.services[id]) {
      addLine(id, config.services[id].label, wheels, "колесо", getUnitPrice(id, input, config));
    }
  }

  // Фиксированные «за колесо»
  if (input.services.wash) {
    addLine("wash", config.services.wash.label, wheels, "колесо", config.perWheelFlat.wash);
  }
  if (input.services.bags) {
    addLine("bags", config.services.bags.label, wheels, "колесо", config.perWheelFlat.bags);
  }

  // Ремонт проколов: количество проколов не привязано к количеству колёс
  if (input.punctures > 0) {
    addLine(
      "punctureRepair",
      config.puncture.label,
      input.punctures,
      "прокол",
      getUnitPrice("punctureRepair", input, config),
    );
  }

  // Правка дисков: считается за диск и не привязана к количеству колёс
  if (input.discs > 0) {
    addLine(
      "discRepair",
      config.discRepair.label,
      input.discs,
      "диск",
      getUnitPrice("discRepair", input, config),
    );
  }

  // Сезонное хранение: колёса × месяцы
  if (input.storageMonths > 0) {
    const qty = wheels * input.storageMonths;
    addLine(
      "storage",
      `${config.storage.label}, ${input.storageMonths} мес.`,
      qty,
      "колесо × мес.",
      config.storage.perWheelPerMonth,
    );
    if (input.storageMonths >= config.storage.longTermFrom) {
      const storageTotal = qty * config.storage.perWheelPerMonth;
      discounts.push({
        id: "storageLongTerm",
        label: `Скидка за хранение от ${config.storage.longTermFrom} мес. (${config.storage.longTermDiscountPercent}%)`,
        amount: roundTo(
          (storageTotal * config.storage.longTermDiscountPercent) / 100,
          config.roundTo,
        ),
      });
    }
  }

  // Выезд на дом: фиксированная цена
  if (input.homeVisit) {
    addLine("homeVisit", config.extras.homeVisit.label, 1, "выезд", config.extras.homeVisit.price);
  }

  // Скидка за комплекс
  const isComplex =
    input.services.removeInstall &&
    input.services.mountDemount &&
    input.services.balancing &&
    wheels >= config.complexDiscount.minWheels;
  if (isComplex) {
    const complexBase = lines
      .filter((l) => (radiusPriced as readonly string[]).includes(l.id))
      .reduce((sum, l) => sum + l.total, 0);
    discounts.push({
      id: "complex",
      label: config.complexDiscount.label,
      amount: roundTo((complexBase * config.complexDiscount.percent) / 100, config.roundTo),
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  const afterDiscounts = Math.max(0, subtotal - discountTotal);

  const urgencyFee = input.urgent
    ? roundTo((afterDiscounts * config.extras.urgent.percent) / 100, config.roundTo)
    : 0;

  return {
    lines,
    subtotal,
    discounts,
    urgencyFee,
    total: afterDiscounts + urgencyFee,
    multipliers: {
      vehicle: vehicleMultiplier,
      wheelType: wheelTypeMultiplier,
      combined: vehicleMultiplier * wheelTypeMultiplier,
    },
  };
}

/** Снимок расчёта, который прикрепляется к заявке и уходит в БД и Telegram */
export interface CalculationSnapshot {
  input: CalculatorInput;
  lines: { label: string; qty: number; total: number }[];
  discounts: { label: string; amount: number }[];
  urgencyFee: number;
  total: number;
  /** Человекочитаемое описание параметров, например «Кроссовер / SUV, R17, литые, 4 колеса» */
  summary: string;
}

export function describeInput(
  input: CalculatorInput,
  config: PricingConfig = defaultPricing,
): string {
  const wheelsLabel = `${input.wheels} ${pluralWheels(input.wheels)}`;
  return [
    config.vehicle[input.vehicle].label,
    `R${input.radius}`,
    config.wheelType[input.wheelType].label.toLowerCase(),
    wheelsLabel,
  ].join(", ");
}

export function pluralWheels(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "колесо";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "колеса";
  return "колёс";
}

export function createSnapshot(
  input: CalculatorInput,
  config: PricingConfig = defaultPricing,
): CalculationSnapshot {
  const normalized = normalizeInput(input, config);
  const result = calculatePrice(normalized, config);
  return {
    input: normalized,
    lines: result.lines.map(({ label, qty, total }) => ({ label, qty, total })),
    discounts: result.discounts.map(({ label, amount }) => ({ label, amount })),
    urgencyFee: result.urgencyFee,
    total: result.total,
    summary: describeInput(normalized, config),
  };
}
