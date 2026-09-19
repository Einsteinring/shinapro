import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { sendTelegramTo } from "@/lib/telegram";

/**
 * POST /api/bot — webhook Telegram-бота.
 *
 * Вся запись живёт в Mini App, поэтому у бота ровно одна задача: поздороваться
 * и открыть приложение. Диалоговой логики здесь нет и не нужно.
 */

const GREETING =
  "🛞 <b>ШинаПро</b> — шиномонтаж в Петербурге.\n\n" +
  "Запись занимает минуту: выбираете услугу, параметры колёс, филиал и свободное время. " +
  "Сумма считается сразу, на месте ничего не добавится.\n\n" +
  "Заявка попадает мастеру, подтверждать её отдельно не нужно.";

const HINT =
  "Запись открывается кнопкой ниже — в переписке я заявки не принимаю.\n" +
  `Поговорить с мастером: ${siteConfig.phone}`;

function keyboard() {
  const url = `${siteConfig.url.replace(/\/$/, "")}/app`;
  if (!url.startsWith("https://")) {
    // Telegram открывает Mini App только по https, на localhost кнопки не будет
    console.warn(`[api/bot] NEXT_PUBLIC_SITE_URL не https (${url}), кнопка не показана`);
    return undefined;
  }
  return { inline_keyboard: [[{ text: "Записаться", web_app: { url } }]] };
}

export async function POST(request: NextRequest) {
  // Telegram присылает этот заголовок, если он задан при setWebhook.
  // Без проверки любой желающий мог бы слать боту поддельные апдейты.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  // Апдейты, которые нас не касаются, подтверждаем молча — иначе Telegram будет их повторять
  if (!chatId) return NextResponse.json({ ok: true });

  const text = (update.message?.text ?? "").trim();
  await sendTelegramTo(chatId, text.startsWith("/start") ? GREETING : HINT, keyboard());

  return NextResponse.json({ ok: true });
}
