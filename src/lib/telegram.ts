/**
 * Отправка уведомлений о заявках в Telegram через Bot API.
 * Без токена/чата функция молча пропускает отправку, чтобы локальный запуск не требовал бота.
 * Любая ошибка логируется и не пробрасывается: заявка уже сохранена в БД.
 */
import type { Booking } from "@prisma/client";
import type { Dispatcher } from "undici";
import { getBranch, siteConfig } from "@/config/site";
import type { CalculationSnapshot } from "@/lib/calculator";
import { formatDateRu } from "@/lib/dates";
import { formatBookingNumber, formatPrice } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";

const TELEGRAM_TIMEOUT_MS = 15000;

/**
 * Прокси для Bot API. Нужен там, где api.telegram.org недоступен напрямую:
 * TELEGRAM_PROXY в .env, иначе стандартные HTTPS_PROXY / HTTP_PROXY. На Vercel не задаётся.
 */
function getProxyUrl(): string | undefined {
  return (
    process.env.TELEGRAM_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    undefined
  );
}

interface TelegramRequestInit {
  method: "POST";
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}

let proxyAgent: Dispatcher | undefined;

/**
 * Без прокси используем глобальный fetch. С прокси берём fetch и ProxyAgent из одного
 * пакета undici: смешивать dispatcher одной версии с fetch другой нельзя (UND_ERR_INVALID_ARG).
 */
async function telegramFetch(url: string, init: TelegramRequestInit): Promise<Response> {
  const proxy = getProxyUrl();
  if (!proxy) return fetch(url, init);
  const undici = await import("undici");
  proxyAgent ??= new undici.ProxyAgent(proxy);
  const res = await undici.fetch(url, { ...init, dispatcher: proxyAgent });
  // Response undici и глобальный Response структурно совместимы в нужной нам части
  return res as unknown as Response;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы, уведомление пропущено",
    );
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await telegramFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] Ошибка ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] Не удалось отправить сообщение:", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function formatBookingMessage(booking: Booking): string {
  const branch = getBranch(booking.branchId);
  const number = formatBookingNumber(booking.id);
  const lines: string[] = [
    `🛞 <b>Новая заявка ${escapeHtml(number)}</b>`,
    "",
    `📅 <b>${escapeHtml(formatDateRu(booking.date))}, ${escapeHtml(booking.time)}</b>`,
    `📍 ${escapeHtml(branch?.name ?? booking.branchId)}`,
    "",
    `👤 ${escapeHtml(booking.name)}`,
    `📞 <a href="tel:${escapeHtml(booking.phone)}">${escapeHtml(formatPhoneDisplay(booking.phone))}</a>`,
  ];

  if (booking.car) lines.push(`🚗 ${escapeHtml(booking.car)}`);
  if (booking.comment) lines.push("", `💬 ${escapeHtml(booking.comment)}`);

  const snapshot = parseSnapshot(booking.calculation);
  if (snapshot) {
    lines.push("", `🧮 <b>Расчёт из калькулятора</b>`, `<i>${escapeHtml(snapshot.summary)}</i>`);
    for (const line of snapshot.lines) {
      lines.push(
        `• ${escapeHtml(line.label)} × ${line.qty} — ${escapeHtml(formatPrice(line.total))}`,
      );
    }
    for (const d of snapshot.discounts) {
      lines.push(`• ${escapeHtml(d.label)} — −${escapeHtml(formatPrice(d.amount))}`);
    }
    if (snapshot.urgencyFee > 0) {
      lines.push(`• Срочность — +${escapeHtml(formatPrice(snapshot.urgencyFee))}`);
    }
    lines.push(`<b>Итого ориентировочно: ${escapeHtml(formatPrice(snapshot.total))}</b>`);
  }

  lines.push("", `<a href="${siteConfig.url}/admin">Открыть в админке</a>`);
  return lines.join("\n");
}

export function parseSnapshot(json: string | null | undefined): CalculationSnapshot | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as CalculationSnapshot;
  } catch {
    return null;
  }
}

export async function notifyNewBooking(booking: Booking): Promise<boolean> {
  return sendTelegramMessage(formatBookingMessage(booking));
}
