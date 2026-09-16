/**
 * Создаёт .env из .env.example, если его ещё нет, и подставляет случайный
 * ADMIN_SESSION_SECRET, чтобы проект запускался одной командой.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const target = new URL("../.env", import.meta.url);
const example = new URL("../.env.example", import.meta.url);

if (existsSync(target)) {
  console.log("[setup] .env уже существует, пропускаю");
} else {
  const secret = randomBytes(32).toString("hex");
  const content = readFileSync(example, "utf8").replace(
    /ADMIN_SESSION_SECRET=".*"/,
    'ADMIN_SESSION_SECRET="' + secret + '"',
  );
  writeFileSync(target, content, "utf8");
  console.log("[setup] Создан .env из .env.example (пароль админки: change-me)");
}
