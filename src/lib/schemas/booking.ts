/**
 * Zod-схемы заявки. Одна и та же схема валидирует форму на клиенте (react-hook-form)
 * и тело запроса на сервере (route handler), поэтому правила не расходятся.
 */
import { z } from "zod";
import {
  PER_WHEEL_SERVICES,
  RADII,
  VEHICLE_TYPES,
  WHEEL_COUNTS,
  WHEEL_TYPES,
} from "@/config/pricing";
import { BRANCH_IDS, getBranch } from "@/config/site";
import { ISO_DATE_RE, isValidISODate, TIME_RE } from "@/lib/dates";
import { PHONE_MASK_RE } from "@/lib/phone";
import { isBranchOpenOn } from "@/lib/slots";

export const BOOKING_STATUSES = ["new", "confirmed", "done", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: "Новая",
  confirmed: "Подтверждена",
  done: "Выполнена",
  cancelled: "Отменена",
};

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

const servicesShape = Object.fromEntries(
  PER_WHEEL_SERVICES.map((id) => [id, z.boolean()]),
) as Record<(typeof PER_WHEEL_SERVICES)[number], z.ZodBoolean>;

export const calculatorInputSchema = z.object({
  vehicle: z.enum(VEHICLE_TYPES),
  radius: z.literal([...RADII]),
  wheelType: z.enum(WHEEL_TYPES),
  wheels: z.literal([...WHEEL_COUNTS]),
  services: z.object(servicesShape),
  punctures: z.number().int().min(0).max(20),
  storageMonths: z.number().int().min(0).max(24),
  homeVisit: z.boolean(),
  urgent: z.boolean(),
});

export const calculationSnapshotSchema = z.object({
  input: calculatorInputSchema,
  lines: z
    .array(z.object({ label: z.string().max(120), qty: z.number(), total: z.number() }))
    .max(20),
  discounts: z.array(z.object({ label: z.string().max(160), amount: z.number() })).max(10),
  urgencyFee: z.number().min(0),
  total: z.number().min(0).max(1_000_000),
  summary: z.string().max(200),
});

export type CalculationSnapshotInput = z.infer<typeof calculationSnapshotSchema>;

export const bookingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Введите имя, минимум 2 символа")
      .max(60, "Слишком длинное имя")
      .regex(/^[\p{L}\s'’-]+$/u, "Имя может содержать только буквы"),
    phone: z.string().regex(PHONE_MASK_RE, "Введите телефон полностью"),
    car: z.string().trim().max(80, "Не больше 80 символов").optional().or(z.literal("")),
    branchId: z.enum(BRANCH_IDS, { error: "Выберите филиал" }),
    date: z
      .string()
      .regex(ISO_DATE_RE, "Выберите дату")
      .refine(isValidISODate, "Некорректная дата"),
    time: z.string().regex(TIME_RE, "Выберите время"),
    comment: z.string().trim().max(500, "Не больше 500 символов").optional().or(z.literal("")),
    consent: z.literal(true, { error: "Нужно согласие на обработку данных" }),
    /** Honeypot: люди это поле не видят и не заполняют */
    website: z.string().max(0).optional().or(z.literal("")),
    calculation: calculationSnapshotSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const branch = getBranch(data.branchId);
    if (branch && !isBranchOpenOn(branch, data.date)) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "В этот день филиал не работает, выберите другую дату",
      });
    }
  });

export type BookingFormValues = z.input<typeof bookingSchema>;
export type BookingPayload = z.output<typeof bookingSchema>;

export const slotsQuerySchema = z.object({
  branch: z.enum(BRANCH_IDS),
  date: z.string().regex(ISO_DATE_RE).refine(isValidISODate, "Некорректная дата"),
});

export const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Введите пароль").max(200),
});
