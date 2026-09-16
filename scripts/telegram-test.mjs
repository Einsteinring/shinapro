/**
 * Проверка связки с Telegram: читает TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID из .env,
 * запрашивает имя бота и отправляет тестовое сообщение в чат.
 * Если задан TELEGRAM_PROXY (или HTTPS_PROXY), запросы идут через прокси,
 * как и в самом приложении. Запуск: npm run telegram:test
 */
import { readFileSync } from "node:fs";
import { fetch as undiciFetch, ProxyAgent } from "undici";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [
        key.trim(),
        rest
          .join("=")
          .trim()
          .replace(/^"(.*)"$/, "$1"),
      ];
    }),
);

const token = env.TELEGRAM_BOT_TOKEN;
const chatId = env.TELEGRAM_CHAT_ID;
const proxy =
  env.TELEGRAM_PROXY ||
  process.env.TELEGRAM_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY;

if (!token || !chatId) {
  console.error("В .env не заполнены TELEGRAM_BOT_TOKEN и/или TELEGRAM_CHAT_ID");
  process.exit(1);
}

const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
console.log(proxy ? "Прокси: " + proxy : "Прокси не задан, подключаемся напрямую");

const api = async (method, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const doFetch = dispatcher ? undiciFetch : fetch;
    const res = await doFetch("https://api.telegram.org/bot" + token + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
      dispatcher,
    });
    return await res.json();
  } catch (error) {
    console.error("Нет связи с api.telegram.org:", error.cause?.code ?? error.message);
    console.error(
      "Если Telegram у вас работает только через VPN/прокси, укажите его адрес в .env:\n" +
        '  TELEGRAM_PROXY="http://127.0.0.1:10809"',
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
};

const me = await api("getMe");
if (!me.ok) {
  console.error("Токен не принят Telegram:", me.description);
  process.exit(1);
}
console.log("Бот найден: @" + me.result.username);

const sent = await api("sendMessage", {
  chat_id: chatId,
  parse_mode: "HTML",
  text: "✅ <b>ШинаПро</b>: уведомления подключены.\nЗаявки с сайта будут приходить в этот чат.",
});

if (!sent.ok) {
  console.error("Сообщение не отправлено:", sent.description);
  console.error("Частая причина: вы ещё не написали боту /start, либо chat_id указан неверно.");
  process.exit(1);
}
console.log("Тестовое сообщение отправлено, проверьте Telegram.");
