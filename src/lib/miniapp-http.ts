/**
 * Общая обвязка эндпоинтов Mini App: проверка подписи, единый формат ошибок.
 * Коды совпадают с теми, что разбирает public/app/js/api.js, — человеческий
 * текст подбирается на клиенте, сервер отдаёт только код.
 */
import { NextResponse } from "next/server";
import { BookingForbiddenError, BookingNotFoundError, SlotUnavailableError } from "@/lib/bookings";
import { OrderValidationError } from "@/lib/miniapp";
import { InitDataError, userFromRequest, type TelegramUser } from "@/lib/telegram-webapp";

export type MiniappErrorCode =
  "auth" | "validation" | "slot_taken" | "not_found" | "forbidden" | "rate_limited" | "server";

export function fail(code: MiniappErrorCode, message: string, status: number, extra?: object) {
  return NextResponse.json({ error: code, message, ...extra }, { status });
}

export function ok(payload: object, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

/** Достаёт пользователя из проверенного initData. Ошибку превращает в 401. */
export function requireUser(request: Request): TelegramUser {
  return userFromRequest(request);
}

/** Одна точка перевода исключений в ответы, чтобы route handlers оставались тонкими */
export function toResponse(error: unknown, where: string) {
  if (error instanceof InitDataError) {
    return fail("auth", "Telegram не подтвердил, что это вы", 401);
  }
  if (error instanceof OrderValidationError) {
    return fail("validation", error.message, 400);
  }
  if (error instanceof SlotUnavailableError) {
    return fail("slot_taken", "Это время уже заняли", 409);
  }
  if (error instanceof BookingNotFoundError) {
    return fail("not_found", "Запись не найдена", 404);
  }
  if (error instanceof BookingForbiddenError) {
    return fail("forbidden", "Эта запись принадлежит другому пользователю", 403);
  }
  console.error(`[${where}]`, error);
  return fail("server", "Не удалось выполнить запрос", 500);
}
