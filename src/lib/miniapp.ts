/**
 * Каталог услуг Mini App и мост к калькулятору сайта.
 *
 * Прайс у сайта и у приложения один — src/config/pricing.ts. Mini App не заводит
 * своих цен: он лишь спрашивает у человека услугу и параметры, а сумму получает
 * из того же calculatePrice, что считает калькулятор на главной. Поэтому заявка
 * из Telegram попадает в админку с точно такой же расшифровкой, как заявка с сайта.
 */
import { z } from "zod";
import {
  pricing,
  RADII,
  RADIUS_BANDS,
  VEHICLE_TYPES,
  WHEEL_TYPES,
  type PricingConfig,
  type VehicleType,
  type WheelType,
} from "@/config/pricing";
import { BRANCH_IDS, branches, siteConfig, type BranchId } from "@/config/site";
import {
  calculatePrice,
  normalizeInput,
  type CalculationSnapshot,
  type CalculatorInput,
} from "@/lib/calculator";
import { addMonths, ISO_DATE_RE, isValidISODate, TIME_RE } from "@/lib/dates";
import { formatBookingNumber, pluralize } from "@/lib/format";

/** Единица измерения услуги: у одной считают колёса, у другой проколы, у третьей диски */
export const MINIAPP_UNITS = {
  wheel: { label: "Колёса", forms: ["колесо", "колеса", "колёс"], max: 4 },
  puncture: { label: "Проколы", forms: ["прокол", "прокола", "проколов"], max: 8 },
  disc: { label: "Диски", forms: ["диск", "диска", "дисков"], max: 4 },
} as const satisfies Record<
  string,
  { label: string; forms: [string, string, string] | readonly string[]; max: number }
>;

export type MiniappUnitId = keyof typeof MINIAPP_UNITS;

export interface MiniappService {
  id: string;
  title: string;
  short: string;
  duration: string;
  unit: MiniappUnitId;
  /** Работы прайса, из которых собрана услуга. У проколов, дисков и хранения свои поля расчёта. */
  works: readonly ("removeInstall" | "mountDemount" | "balancing")[];
  defaultCount: number;
  /** Ссылка на страницу услуги на сайте — тексты берём оттуда, не выдумываем заново */
  slug: string;
  /** Хранение — единственная услуга без получасового слота: бронируется день сдачи шин */
  storage?: true;
  months?: number[];
  defaultMonths?: number;
}

export const MINIAPP_SERVICES: readonly MiniappService[] = [
  {
    id: "seasonal",
    title: "Сезонная замена комплекта",
    short: "Снимем, перебортируем, отбалансируем и поставим обратно",
    duration: "40–60 минут",
    unit: "wheel",
    works: ["removeInstall", "mountDemount", "balancing"],
    defaultCount: 4,
    slug: "shinomontazh",
  },
  {
    id: "puncture",
    title: "Ремонт прокола",
    short: "Грибок или заплатка. Честно скажем, если шину не спасти",
    duration: "20–40 минут",
    unit: "puncture",
    works: [],
    defaultCount: 1,
    slug: "remont-prokolov",
  },
  {
    id: "discRepair",
    title: "Правка диска",
    short: "Холодная прокатка на стенде, без нагрева и трещин",
    duration: "30–90 минут",
    unit: "disc",
    works: [],
    defaultCount: 1,
    slug: "pravka-diskov",
  },
  {
    id: "balancing",
    title: "Балансировка",
    short: "Точность до грамма, грузики уже в цене",
    duration: "5–7 минут на колесо",
    unit: "wheel",
    works: ["balancing"],
    defaultCount: 4,
    slug: "balansirovka",
  },
  {
    id: "removeInstall",
    title: "Снятие и установка",
    short: "Снимем колёса и поставим обратно, затяжка динамометром",
    duration: "20–30 минут",
    unit: "wheel",
    works: ["removeInstall"],
    defaultCount: 4,
    slug: "shinomontazh",
  },
  {
    id: "storage",
    title: "Сезонное хранение шин",
    short: "Отапливаемый склад, стеллажи, страховка комплекта",
    duration: "от 1 до 12 месяцев",
    unit: "wheel",
    works: [],
    defaultCount: 4,
    slug: "hranenie-shin",
    storage: true,
    months: [1, 3, 6, 12],
    defaultMonths: 6,
  },
];

export const MINIAPP_SERVICE_IDS = MINIAPP_SERVICES.map((s) => s.id) as [string, ...string[]];

export function getMiniappService(id: string): MiniappService | undefined {
  return MINIAPP_SERVICES.find((s) => s.id === id);
}

/* ---------- заказ ---------- */

export const miniappOrderSchema = z.object({
  service: z.enum(MINIAPP_SERVICE_IDS),
  branchId: z.enum(BRANCH_IDS),
  radius: z.literal([...RADII]),
  vehicle: z.enum(VEHICLE_TYPES),
  wheelType: z.enum(WHEEL_TYPES),
  count: z.number().int().min(1).max(8),
  months: z.number().int().min(0).max(12).default(0),
  date: z.string().regex(ISO_DATE_RE).refine(isValidISODate, "Некорректная дата"),
  /** null — визит без получасового слота (сдача шин на хранение) */
  time: z.string().regex(TIME_RE).nullable(),
  // Имя приходит из Telegram и человек может его поправить: не ограничиваем алфавит,
  // иначе клиент с эмодзи или дефисом в имени упрётся в форму и уйдёт
  name: z.string().trim().min(2, "Введите имя").max(60, "Слишком длинное имя"),
  phone: z.string().regex(/^\+7\d{10}$/, "Телефон в формате +7XXXXXXXXXX"),
});

export type MiniappOrder = z.output<typeof miniappOrderSchema>;

/** Заказ разобран по формату, но не сходится по смыслу: чужая единица, срок или время */
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

/**
 * Проверки, которые зависят от каталога услуг, а не от формата полей.
 * Zod следит за типами, а вот «у хранения не бывает времени визита» — уже про смысл.
 */
export function validateOrder(order: MiniappOrder): MiniappService {
  const service = getMiniappService(order.service);
  if (!service) throw new OrderValidationError(`Неизвестная услуга: ${order.service}`);

  const unit = MINIAPP_UNITS[service.unit];
  if (order.count > unit.max) {
    throw new OrderValidationError(`${unit.label.toLowerCase()}: не больше ${unit.max}`);
  }
  if (service.storage) {
    if (!service.months?.includes(order.months)) {
      throw new OrderValidationError("Недопустимый срок хранения");
    }
    if (order.time !== null) throw new OrderValidationError("У хранения не бронируется время");
  } else if (order.time === null) {
    throw new OrderValidationError("Не выбрано время");
  }
  return service;
}

/**
 * Перекладывает выбор из Mini App во вход калькулятора сайта.
 * «Сезонная замена комплекта» — это ровно снятие + монтаж + балансировка,
 * «ремонт прокола» — проколы, «хранение» — месяцы. Совпадение не случайное:
 * калькулятор сайта собран из тех же работ, Mini App лишь предлагает их наборами.
 */
export function toCalculatorInput(order: MiniappOrder): CalculatorInput {
  const service = getMiniappService(order.service);
  const base = {
    vehicle: order.vehicle as VehicleType,
    radius: order.radius,
    wheelType: order.wheelType as WheelType,
    wheels: service?.unit === "wheel" ? order.count : 1,
    services: {
      removeInstall: false,
      mountDemount: false,
      balancing: false,
      wash: false,
      bags: false,
    },
    punctures: 0,
    discs: 0,
    storageMonths: 0,
    homeVisit: false,
    urgent: false,
  };

  for (const work of service?.works ?? []) base.services[work] = true;

  if (service?.storage) {
    base.wheels = order.count;
    base.storageMonths = order.months;
  } else if (service?.unit === "puncture") {
    base.punctures = order.count;
  } else if (service?.unit === "disc") {
    base.discs = order.count;
  }

  return normalizeInput(base);
}

/** «Сезонная замена комплекта · Кроссовер / SUV, R18, литые, 4 колеса» для админки */
export function describeOrder(order: MiniappOrder, config: PricingConfig = pricing): string {
  const service = getMiniappService(order.service);
  const unit = MINIAPP_UNITS[service?.unit ?? "wheel"];
  const parts: string[] = [];

  // У хранения тип авто и дисков не спрашивают: на цену места на стеллаже они не влияют
  if (!service?.storage) parts.push(config.vehicle[order.vehicle as VehicleType].label);
  parts.push(`R${order.radius}`);
  if (!service?.storage) {
    parts.push(config.wheelType[order.wheelType as WheelType].shortLabel.toLowerCase());
  }
  // pluralize склеивает число с единицей неразрывным пробелом: «4 колеса» не разорвётся переносом
  parts.push(pluralize(order.count, unit.forms as [string, string, string]));
  if (service?.storage) parts.push(pluralize(order.months, ["месяц", "месяца", "месяцев"]));

  return `${service?.title ?? order.service} · ${parts.join(", ")}`;
}

/** Снимок расчёта в том же формате, что кладёт калькулятор сайта */
export function buildSnapshot(order: MiniappOrder): CalculationSnapshot {
  const input = toCalculatorInput(order);
  const result = calculatePrice(input);
  return {
    input,
    lines: result.lines.map(({ label, qty, total }) => ({ label, qty, total })),
    discounts: result.discounts.map(({ label, amount }) => ({ label, amount })),
    urgencyFee: result.urgencyFee,
    total: result.total,
    summary: describeOrder(order),
  };
}

/* ---------- прайс для клиента ---------- */

/**
 * Всё, что нужно приложению, чтобы пересчитывать сумму на экране без запроса к серверу.
 * Собирается из тех же конфигов, поэтому разъехаться с сайтом не может.
 */
export function miniappPricingPayload() {
  return {
    currency: pricing.currency,
    roundTo: pricing.roundTo,
    radii: [...RADII],
    bands: RADIUS_BANDS.map((b) => ({ id: b.id, label: b.label, radii: [...b.radii] })),
    perWheelByBand: pricing.perWheelByBand,
    vehicle: VEHICLE_TYPES.map((id) => ({
      id,
      label: pricing.vehicle[id].shortLabel,
      fullLabel: pricing.vehicle[id].label,
      hint: pricing.vehicle[id].hint,
      multiplier: pricing.vehicle[id].multiplier,
    })),
    wheelType: WHEEL_TYPES.map((id) => ({
      id,
      label: pricing.wheelType[id].shortLabel,
      fullLabel: pricing.wheelType[id].label,
      hint: pricing.wheelType[id].hint,
      multiplier: pricing.wheelType[id].multiplier,
    })),
    works: {
      removeInstall: pricing.services.removeInstall.label,
      mountDemount: pricing.services.mountDemount.label,
      balancing: pricing.services.balancing.label,
      punctureRepair: pricing.puncture.label,
      discRepair: pricing.discRepair.label,
    },
    storage: {
      label: pricing.storage.label,
      perWheelPerMonth: pricing.storage.perWheelPerMonth,
      longTermFrom: pricing.storage.longTermFrom,
      longTermDiscountPercent: pricing.storage.longTermDiscountPercent,
    },
    complexDiscount: pricing.complexDiscount,
    units: Object.fromEntries(
      Object.entries(MINIAPP_UNITS).map(([id, u]) => [
        id,
        { label: u.label, forms: [...u.forms], max: u.max },
      ]),
    ),
    services: MINIAPP_SERVICES.map((s) => ({
      ...s,
      priceFromLabel: priceFromLabel(s),
    })),
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      shortName: b.shortName,
      address: b.address,
      metro: b.metro,
      phone: b.phone,
      hoursLabel: b.hoursLabel,
      schedule: b.schedule,
    })),
    schedule: {
      slotMinutes: siteConfig.slotMinutes,
      leadMinutes: siteConfig.bookingLeadMinutes,
      horizonDays: siteConfig.bookingHorizonDays,
      timeZone: siteConfig.timeZone,
    },
  };
}

export type MiniappPricing = ReturnType<typeof miniappPricingPayload>;

/** «от 550 ₽ за колесо» — минимум по самому дешёвому диапазону без наценок */
function priceFromLabel(service: MiniappService): string {
  const cheapest = pricing.perWheelByBand["r13-15"];
  const per: Record<string, { sum: number; unit: string }> = {
    seasonal: {
      sum: cheapest.removeInstall + cheapest.mountDemount + cheapest.balancing,
      unit: "за колесо",
    },
    balancing: { sum: cheapest.balancing, unit: "за колесо" },
    removeInstall: { sum: cheapest.removeInstall, unit: "за колесо" },
    puncture: { sum: cheapest.punctureRepair, unit: "за прокол" },
    discRepair: { sum: cheapest.discRepair, unit: "за диск" },
    storage: { sum: pricing.storage.perWheelPerMonth, unit: "за колесо в месяц" },
  };
  const entry = per[service.id];
  return entry ? `от ${entry.sum} ${pricing.currency} ${entry.unit}` : "";
}

export function isBranchIdSafe(value: unknown): value is BranchId {
  return typeof value === "string" && (BRANCH_IDS as readonly string[]).includes(value);
}

/* ---------- ответ клиенту ---------- */

export interface PublicBooking {
  id: number;
  number: string;
  service: string | null;
  serviceTitle: string;
  branchId: string;
  date: string;
  time: string | null;
  /** Дата, когда забирать шины со склада; у остальных услуг null */
  until: string | null;
  months: number;
  name: string;
  phone: string;
  total: number;
  summary: string;
  status: string;
}

type BookingRow = {
  id: number;
  service: string | null;
  branchId: string;
  date: string;
  time: string | null;
  name: string;
  phone: string;
  calcTotal: number | null;
  calculation: string | null;
  status: string;
};

/** Приводит строку из базы к тому, что рисует приложение. Телефон и id владельца наружу не идут лишнего */
export function publicBooking(row: BookingRow): PublicBooking {
  const service = row.service ? getMiniappService(row.service) : undefined;
  let months = 0;
  let summary = service?.title ?? "Запись";

  if (row.calculation) {
    try {
      const snapshot = JSON.parse(row.calculation) as CalculationSnapshot;
      months = snapshot.input?.storageMonths ?? 0;
      if (snapshot.summary) summary = snapshot.summary;
    } catch {
      // Битый снимок не должен ломать список записей
    }
  }

  return {
    id: row.id,
    number: formatBookingNumber(row.id),
    service: row.service,
    serviceTitle: service?.title ?? "Запись",
    branchId: row.branchId,
    date: row.date,
    time: row.time,
    until: service?.storage && months > 0 ? addMonths(row.date, months) : null,
    months,
    name: row.name,
    phone: row.phone,
    total: row.calcTotal ?? 0,
    summary,
    status: row.status,
  };
}
