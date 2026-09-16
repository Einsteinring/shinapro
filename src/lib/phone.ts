/**
 * Маска российского телефона +7 (___) ___-__-__ без сторонних библиотек.
 */

export const PHONE_MASK_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
export const PHONE_MASK_PLACEHOLDER = "+7 (___) ___-__-__";

/** Достаёт 10 «национальных» цифр из любого ввода: 8 999..., +7 999..., 999... */
export function extractNationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("7") || digits.startsWith("8")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Форматирует произвольный ввод под маску. Пустой ввод даёт пустую строку. */
export function formatPhoneInput(raw: string): string {
  const digits = extractNationalDigits(raw);
  if (!digits) return "";

  let result = "+7 (";
  result += digits.slice(0, 3);
  if (digits.length >= 3) result += ") ";
  if (digits.length > 3) result += digits.slice(3, 6);
  if (digits.length >= 6) result += "-";
  if (digits.length > 6) result += digits.slice(6, 8);
  if (digits.length >= 8) result += "-";
  if (digits.length > 8) result += digits.slice(8, 10);
  return result;
}

/** Нормализует телефон к E.164: +79991234567 */
export function normalizePhone(masked: string): string {
  return `+7${extractNationalDigits(masked)}`;
}

/** Обратное: из E.164 или любого вида в маску для показа */
export function formatPhoneDisplay(value: string): string {
  return formatPhoneInput(value) || value;
}
