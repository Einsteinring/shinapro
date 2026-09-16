const NBSP = " ";

/** «2 900 ₽» с неразрывными пробелами */
export function formatPrice(value: number, currency = "₽"): string {
  return `${formatNumber(value)}${NBSP}${currency}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/\s/g, NBSP);
}

/** Склонение: pluralize(3, ["месяц", "месяца", "месяцев"]) → «3 месяца» */
export function pluralize(n: number, forms: [string, string, string], withNumber = true): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let form: string;
  if (mod10 === 1 && mod100 !== 11) form = forms[0];
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) form = forms[1];
  else form = forms[2];
  return withNumber ? `${n}${NBSP}${form}` : form;
}

/** SP-00042 — публичный номер заявки */
export function formatBookingNumber(id: number): string {
  return `SP-${String(id).padStart(5, "0")}`;
}
