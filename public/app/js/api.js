/**
 * Сеть. Внутри Telegram — запросы к тем же серверным функциям, что обслуживают сайт,
 * и заявка ложится в общую таблицу. В демо-режиме те же вызовы уходят в память вкладки.
 * Вызывающий код в обоих случаях получает либо данные, либо ошибку с полем code.
 */
import { tg } from "./tg.js";
import { createDemoStore } from "./demo.js";

const TIMEOUT_MS = 12000;

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Тексты ошибок живут здесь, чтобы интерфейс нигде не показывал «Error 500» */
const MESSAGES = {
  slot_taken: "Этот слот заняли, пока вы выбирали. Ниже — что осталось свободным",
  network: "Нет сети. Проверьте подключение и попробуйте ещё раз",
  timeout: "Сервер долго не отвечает. Попробуйте ещё раз",
  server: "Сервер не ответил. Мы уже знаем, попробуйте через минуту",
  auth: "Telegram не подтвердил, что это вы. Закройте приложение и откройте заново",
  validation: "Проверьте данные: что-то заполнено не так",
  rate_limited: "Слишком много заявок подряд. Попробуйте через несколько минут",
  not_found: "Запись не найдена — возможно, её уже отменили",
  forbidden: "Эта запись не ваша",
  unknown: "Что-то пошло не так. Попробуйте ещё раз",
};

/** Ошибка уже несёт готовый текст; код остаётся на случай, если его забыли подставить */
export function messageFor(error) {
  return error?.message || MESSAGES[error?.code] || MESSAGES.unknown;
}

let demo = null;

export function initApi(pricingData) {
  if (tg.isDemo) demo = createDemoStore(pricingData);
}

export function demoStore() {
  return demo;
}

async function request(path, { method = "GET", body = null, query = null } = {}) {
  // Приложение живёт по /app, а эндпоинты — в корне, поэтому пути абсолютные
  const url = new URL(path, window.location.origin);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "X-Telegram-Init-Data": tg.initData,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(error.name === "AbortError" ? "timeout" : "network", MESSAGES.network);
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const code = data?.error ?? (response.status >= 500 ? "server" : "unknown");
    // У валидации и лимита сервер объясняет конкретнее, чем общий текст
    const detailed = code === "validation" || code === "rate_limited";
    throw new ApiError(code, (detailed && data?.message) || MESSAGES[code] || MESSAGES.unknown);
  }
  return data;
}

/** Прайс открыт: те же цифры напечатаны в калькуляторе на главной сайта */
export async function fetchPricing() {
  const response = await fetch("/api/miniapp/pricing", { cache: "no-cache" });
  if (!response.ok) throw new ApiError("server", "Не удалось загрузить прайс");
  return response.json();
}

export const api = {
  /** Занятость и выходные филиала на весь горизонт записи одним ответом */
  async schedule(branchId) {
    if (demo) return demo.schedule(branchId);
    const data = await request("/api/miniapp/slots", { query: { branch: branchId } });
    return { busy: data.busy ?? {}, closed: data.closed ?? [] };
  },

  async book(order) {
    if (demo) return demo.book(order);
    const data = await request("/api/miniapp/bookings", { method: "POST", body: order });
    return data.booking;
  },

  async mine() {
    if (demo) return demo.mine();
    const data = await request("/api/miniapp/bookings");
    return data.bookings ?? [];
  },

  async cancel(id) {
    if (demo) return demo.cancel(id);
    return request("/api/miniapp/bookings/cancel", { method: "POST", body: { id } });
  },
};
