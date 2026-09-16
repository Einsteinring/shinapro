/**
 * Данные бренда, филиалов и контактов. Единственное место, где живут адреса,
 * телефоны и график работы: их читают секции сайта, Schema.org, генератор слотов и Telegram.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 — воскресенье (как в Date#getDay)

export interface DaySchedule {
  /** Час открытия, 24h */
  open: number;
  /** Час закрытия, 24h (последний слот начинается за slotMinutes до закрытия) */
  close: number;
}

export const BRANCH_IDS = ["moskovskaya", "primorskaya"] as const;
export type BranchId = (typeof BRANCH_IDS)[number];

export interface Branch {
  id: BranchId;
  name: string;
  shortName: string;
  address: string;
  metro: string;
  phone: string;
  phoneHref: string;
  coords: { lat: number; lng: number };
  /** Расписание по дням недели; null — выходной */
  schedule: Record<Weekday, DaySchedule | null>;
  /** Человекочитаемый график для карточки */
  hoursLabel: string;
}

const everyDay = (open: number, close: number): Record<Weekday, DaySchedule> => ({
  0: { open, close },
  1: { open, close },
  2: { open, close },
  3: { open, close },
  4: { open, close },
  5: { open, close },
  6: { open, close },
});

export const branches: readonly Branch[] = [
  {
    id: "moskovskaya",
    name: "ШинаПро на Типанова",
    shortName: "Московская",
    address: "Санкт-Петербург, ул. Типанова, 21, бокс 4",
    metro: "м. Московская, 7 минут пешком",
    phone: "+7 (812) 240-40-40",
    phoneHref: "tel:+78122404040",
    coords: { lat: 59.8529, lng: 30.3379 },
    schedule: everyDay(9, 21),
    hoursLabel: "Ежедневно 09:00–21:00",
  },
  {
    id: "primorskaya",
    name: "ШинаПро на Богатырском",
    shortName: "Приморская",
    address: "Санкт-Петербург, Богатырский пр., 18к1",
    metro: "м. Пионерская, 10 минут пешком",
    phone: "+7 (812) 240-40-41",
    phoneHref: "tel:+78122404041",
    coords: { lat: 60.0052, lng: 30.2847 },
    schedule: { ...everyDay(9, 20), 6: { open: 10, close: 18 }, 0: null },
    hoursLabel: "Пн–Пт 09:00–20:00, Сб 10:00–18:00, Вс — выходной",
  },
];

export function getBranch(id: string): Branch | undefined {
  return branches.find((b) => b.id === id);
}

export function isBranchId(id: string): id is BranchId {
  return (BRANCH_IDS as readonly string[]).includes(id);
}

export const siteConfig = {
  name: "ШинаПро",
  legalName: "ООО «ШинаПро»",
  tagline: "Шиномонтаж и автосервис в Санкт-Петербурге",
  description:
    "Шиномонтаж, балансировка, ремонт проколов, правка дисков, сезонное хранение шин и замена масла. Две точки в Петербурге, онлайн-запись без очереди, честный калькулятор стоимости.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "+7 (812) 240-40-40",
  phoneHref: "tel:+78122404040",
  email: "hello@shinapro.spb.ru",
  telegram: "https://t.me/shinapro_spb",
  foundedYear: 2014,
  /** Шаг записи, минуты */
  slotMinutes: 30,
  /** На сколько дней вперёд открыта запись */
  bookingHorizonDays: 30,
  /** Минимальный запас до ближайшего слота, минуты */
  bookingLeadMinutes: 60,
  /** Часовой пояс филиалов */
  timeZone: "Europe/Moscow",
} as const;

export const trustBadges = [
  { label: "Гарантия 12 месяцев", description: "на балансировку и ремонт" },
  { label: "12 лет опыта", description: "работаем с 2014 года" },
  { label: "09:00–21:00", description: "без выходных на Типанова" },
] as const;

export const navigation = [
  { href: "/#services", label: "Услуги" },
  { href: "/#calculator", label: "Калькулятор" },
  { href: "/#how", label: "Как работаем" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#faq", label: "Вопросы" },
  { href: "/#contacts", label: "Контакты" },
] as const;
