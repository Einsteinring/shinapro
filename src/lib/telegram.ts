/**
 * Работа с Telegram Bot API.
 *
 * Уведомлений о заявках здесь больше нет: и сайт, и Mini App пишут в одну таблицу,
 * и разбираются заявки в админке. Осталось то, чем отвечает бот на /start,
 * и разбор снимка расчёта, который показывает админка.
 */
import type { Dispatcher } from "undici";
import type { CalculationSnapshot } from "@/lib/calculator";

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

/** Сообщение в чат — этим бот отвечает на /start */
export async function sendTelegramTo(
  chatId: number | string,
  html: string,
  replyMarkup?: object,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN не задан, ответ боту пропущен");
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
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[telegram] sendMessage ${res.status}: ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] Не удалось ответить в чат:", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function parseSnapshot(json: string | null | undefined): CalculationSnapshot | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as CalculationSnapshot;
  } catch {
    return null;
  }
}
