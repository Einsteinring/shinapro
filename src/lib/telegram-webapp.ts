/**
 * Проверка initData, который Telegram передаёт в Mini App.
 *
 * Пока подпись не сошлась, initData — просто строка от неизвестного клиента.
 * Telegram id берётся только отсюда: в телах запросов Mini App его нет и оттуда
 * он никогда не читается, иначе любой мог бы смотреть и отменять чужие записи.
 *
 * Алгоритм из документации Telegram:
 *   data_check_string = поля initData кроме hash, отсортированные по ключу, через \n
 *   secret_key        = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN)
 *   hash              = HMAC_SHA256(key=secret_key, msg=data_check_string)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const INIT_DATA_HEADER = "x-telegram-init-data";
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class InitDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitDataError";
  }
}

export interface VerifyOptions {
  botToken?: string;
  maxAgeSeconds?: number;
  now?: Date;
}

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new InitDataError("TELEGRAM_BOT_TOKEN не задан");
  return token;
}

function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function verifyInitData(initData: string, options: VerifyOptions = {}): TelegramUser {
  if (!initData) throw new InitDataError("Пустой initData");

  const token = options.botToken ?? getBotToken();
  const maxAge = options.maxAgeSeconds ?? INIT_DATA_MAX_AGE_SECONDS;
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new InitDataError("В initData нет hash");
  params.delete("hash");

  // Из строки проверки исключается только hash. Поле signature (Ed25519 для сторонней
  // проверки) в неё входит, иначе подпись не сойдётся на новых клиентах.
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const expected = createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (!equalHex(expected, receivedHash)) throw new InitDataError("Подпись initData не совпала");

  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate)) throw new InitDataError("Некорректный auth_date");

  const age = nowSeconds - authDate;
  if (age > maxAge) throw new InitDataError("initData просрочен");
  // Небольшой запас на расхождение часов клиента и сервера
  if (age < -300) throw new InitDataError("auth_date из будущего");

  let user: unknown;
  try {
    user = JSON.parse(params.get("user") ?? "null");
  } catch {
    throw new InitDataError("Некорректное поле user");
  }

  if (
    typeof user !== "object" ||
    user === null ||
    typeof (user as TelegramUser).id !== "number" ||
    !Number.isInteger((user as TelegramUser).id)
  ) {
    throw new InitDataError("В initData нет пользователя");
  }

  return user as TelegramUser;
}

/** Достаёт пользователя из заголовка запроса; бросает InitDataError, если подпись не сошлась */
export function userFromRequest(request: Request, options: VerifyOptions = {}): TelegramUser {
  return verifyInitData(request.headers.get(INIT_DATA_HEADER) ?? "", options);
}
