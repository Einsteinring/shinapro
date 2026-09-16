/**
 * ПРАЙС-ЛИСТ. Единственное место, где живут цены калькулятора.
 * Владелец меняет числа здесь, логика расчёта (src/lib/calculator.ts) не трогается.
 * Все суммы в рублях за единицу (колесо, прокол, месяц и т. д.).
 */

export const VEHICLE_TYPES = ["sedan", "suv", "minivan", "lcv"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const WHEEL_TYPES = ["steel", "alloy", "lowprofile"] as const;
export type WheelType = (typeof WHEEL_TYPES)[number];

export const RADII = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const;
export type Radius = (typeof RADII)[number];

export const WHEEL_COUNTS = [1, 2, 3, 4] as const;
export type WheelCount = (typeof WHEEL_COUNTS)[number];

/** Услуги «за колесо», которые включаются чекбоксами */
export const PER_WHEEL_SERVICES = [
  "removeInstall",
  "mountDemount",
  "balancing",
  "wash",
  "bags",
] as const;
export type PerWheelService = (typeof PER_WHEEL_SERVICES)[number];

/** Диапазоны радиусов: реальные шиномонтажи считают прайс именно так */
export const RADIUS_BANDS = [
  { id: "r13-15", label: "R13–R15", radii: [13, 14, 15] },
  { id: "r16-17", label: "R16–R17", radii: [16, 17] },
  { id: "r18-19", label: "R18–R19", radii: [18, 19] },
  { id: "r20-22", label: "R20–R22", radii: [20, 21, 22] },
] as const satisfies ReadonlyArray<{ id: string; label: string; radii: readonly Radius[] }>;

export type RadiusBandId = (typeof RADIUS_BANDS)[number]["id"];

/** Работы, цена которых зависит от радиуса */
export type RadiusPricedWork = "removeInstall" | "mountDemount" | "balancing" | "punctureRepair";

export interface PricingConfig {
  currency: string;
  /** Округление строк расчёта до N рублей */
  roundTo: number;
  vehicle: Record<VehicleType, { label: string; hint: string; multiplier: number }>;
  wheelType: Record<WheelType, { label: string; hint: string; multiplier: number }>;
  /** Цена за одно колесо по диапазону радиуса */
  perWheelByBand: Record<RadiusBandId, Record<RadiusPricedWork, number>>;
  /** Услуги с фиксированной ценой за колесо, не зависящей от радиуса и типа авто */
  perWheelFlat: Record<"wash" | "bags", number>;
  services: Record<PerWheelService, { label: string; hint: string }>;
  puncture: { label: string; hint: string; max: number };
  storage: {
    label: string;
    hint: string;
    perWheelPerMonth: number;
    minMonths: number;
    maxMonths: number;
    /** Скидка при хранении от N месяцев */
    longTermFrom: number;
    longTermDiscountPercent: number;
  };
  extras: {
    homeVisit: { label: string; hint: string; price: number };
    urgent: { label: string; hint: string; percent: number };
  };
  /** Скидка «комплекс»: снятие + монтаж + балансировка на 4 колёсах */
  complexDiscount: { label: string; percent: number; minWheels: WheelCount };
}

export const pricing: PricingConfig = {
  currency: "₽",
  roundTo: 10,

  vehicle: {
    sedan: { label: "Легковой", hint: "седан, хэтчбек, универсал", multiplier: 1 },
    suv: { label: "Кроссовер / SUV", hint: "паркетники и внедорожники", multiplier: 1.2 },
    minivan: { label: "Минивэн", hint: "7–8 мест", multiplier: 1.3 },
    lcv: { label: "Лёгкий коммерческий", hint: "Ларгус, Газель, Transit", multiplier: 1.4 },
  },

  wheelType: {
    steel: { label: "Штампованные", hint: "стальные диски", multiplier: 1 },
    alloy: { label: "Литые", hint: "легкосплавные", multiplier: 1.1 },
    lowprofile: {
      label: "Низкий профиль / Run-Flat",
      hint: "жёсткая боковина, наценка 30%",
      multiplier: 1.3,
    },
  },

  perWheelByBand: {
    "r13-15": { removeInstall: 150, mountDemount: 200, balancing: 200, punctureRepair: 500 },
    "r16-17": { removeInstall: 180, mountDemount: 250, balancing: 250, punctureRepair: 600 },
    "r18-19": { removeInstall: 220, mountDemount: 320, balancing: 320, punctureRepair: 750 },
    "r20-22": { removeInstall: 280, mountDemount: 420, balancing: 420, punctureRepair: 900 },
  },

  perWheelFlat: {
    wash: 100,
    bags: 50,
  },

  services: {
    removeInstall: { label: "Снятие / установка колеса", hint: "с автомобиля и обратно" },
    mountDemount: { label: "Монтаж / демонтаж шины", hint: "разбортировка и сборка" },
    balancing: { label: "Балансировка", hint: "на стенде, грузики включены" },
    wash: { label: "Мойка колёс", hint: "перед балансировкой" },
    bags: { label: "Пакеты для шин", hint: "чтобы не пачкать багажник" },
  },

  puncture: {
    label: "Ремонт прокола",
    hint: "жгут или грибок, зависит от повреждения",
    max: 8,
  },

  storage: {
    label: "Сезонное хранение",
    hint: "отапливаемый склад, страховка включена",
    perWheelPerMonth: 150,
    minMonths: 1,
    maxMonths: 12,
    longTermFrom: 6,
    longTermDiscountPercent: 10,
  },

  extras: {
    homeVisit: {
      label: "Выезд на дом",
      hint: "мобильный шиномонтаж в пределах КАД",
      price: 1500,
    },
    urgent: {
      label: "Срочно, без очереди",
      hint: "берём в работу сразу по приезде",
      percent: 20,
    },
  },

  complexDiscount: {
    label: "Скидка за комплекс: снятие + монтаж + балансировка на 4 колёсах",
    percent: 10,
    minWheels: 4,
  },
};

export function getRadiusBand(radius: Radius): (typeof RADIUS_BANDS)[number] {
  const band = RADIUS_BANDS.find((b) => (b.radii as readonly number[]).includes(radius));
  if (!band) throw new Error(`Нет диапазона цен для радиуса R${radius}`);
  return band;
}
