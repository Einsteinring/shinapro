/**
 * Применяет prisma/constraints.sql — то, что нельзя описать в схеме Prisma.
 * Сейчас там один частичный уникальный индекс, защищающий от двойной брони.
 *
 * Запускается после `prisma db push`: push знает только про индексы из схемы
 * и чужие может удалить, поэтому восстанавливать их нужно каждый раз.
 * SQL идемпотентный, повторный запуск ничего не ломает.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  const envPath = new URL("../.env", import.meta.url);
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
    if (match) process.env.DATABASE_URL = match[1];
  }
}

const url = process.env.DATABASE_URL ?? "";
const isPostgres = /^postgres(ql)?:\/\//.test(url);
const schema = isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

console.log(`[constraints] ${isPostgres ? "PostgreSQL" : "SQLite"} → prisma/constraints.sql`);

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "db", "execute", "--schema", schema, "--file", "prisma/constraints.sql"],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

if (result.status !== 0) {
  // Самая вероятная причина на существующей базе: в ней уже лежат две неотменённые
  // заявки на один слот — как раз то, от чего индекс и защищает. Пока дубли не убраны,
  // создать его нельзя, и сборка честно падает вместо тихого пропуска защиты.
  console.error(
    [
      "",
      "Не удалось создать индекс Booking_slot_unique.",
      "Если база не пустая, скорее всего в ней уже есть дубли — две активные заявки",
      "на один филиал, дату и время. Найти их:",
      "",
      '  SELECT "branchId", "date", "time", count(*), array_agg(id)',
      '  FROM "Booking"',
      "  WHERE status <> 'cancelled' AND \"time\" IS NOT NULL",
      "  GROUP BY 1, 2, 3 HAVING count(*) > 1;",
      "",
      "Лишние заявки нужно отменить (status = 'cancelled') или перенести на другое время,",
      "после чего повторить деплой.",
      "",
    ].join("\n"),
  );
}

process.exit(result.status ?? 1);
