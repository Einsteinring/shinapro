/**
 * Webhook бота для Telegram Mini App.
 *
 *   node scripts/set-webhook.mjs                 # поставить, адрес из NEXT_PUBLIC_SITE_URL
 *   node scripts/set-webhook.mjs --url https://example.com
 *   node scripts/set-webhook.mjs --info
 *   node scripts/set-webhook.mjs --delete
 *
 * Переменные: TELEGRAM_BOT_TOKEN (обязательно), NEXT_PUBLIC_SITE_URL, TELEGRAM_WEBHOOK_SECRET.
 * Если задан TELEGRAM_PROXY / HTTPS_PROXY, запросы идут через прокси, как и в приложении.
 */
import { readFileSync } from "node:fs";
import { fetch as undiciFetch, ProxyAgent } from "undici";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim().replace(/^"(.*)"$/, "$1")];
    }),
);

const token = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан ни в окружении, ни в .env");
  process.exit(1);
}

const proxy =
  env.TELEGRAM_PROXY || process.env.TELEGRAM_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;

async function call(method, payload) {
  const res = await undiciFetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
    dispatcher,
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram отклонил ${method}:`, JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (flag("--info")) {
  console.log(JSON.stringify(await call("getWebhookInfo"), null, 2));
  process.exit(0);
}

if (flag("--delete")) {
  await call("deleteWebhook", { drop_pending_updates: true });
  console.log("Webhook снят");
  process.exit(0);
}

const base = (value("--url") || process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL || "")
  .trim()
  .replace(/\/$/, "");

if (!base) {
  console.error("Укажите --url или задайте NEXT_PUBLIC_SITE_URL");
  process.exit(1);
}
if (!base.startsWith("https://")) {
  console.error(`Telegram принимает webhook только по https, получено: ${base}`);
  process.exit(1);
}

const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET || "").trim();
if (!secret) {
  console.warn("TELEGRAM_WEBHOOK_SECRET пуст: вебхук будет принимать запросы без проверки секрета");
}

await call("setWebhook", {
  url: `${base}/api/bot`,
  // Боту нужны только сообщения: остальное он всё равно игнорирует
  allowed_updates: ["message"],
  drop_pending_updates: true,
  ...(secret ? { secret_token: secret } : {}),
});

console.log(`Webhook: ${base}/api/bot`);
console.log(`Mini App: ${base}/app`);
