/**
 * Обёртка над Prisma CLI: выбирает схему по DATABASE_URL.
 *   postgres://… или postgresql://… → prisma/schema.postgres.prisma (Vercel + Neon)
 *   file:…                          → prisma/schema.prisma (SQLite, локально)
 * Использование: node scripts/prisma.mjs <любые аргументы prisma>
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Подхватываем .env, если переменная не задана окружением (локальный запуск)
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

console.log(`[prisma] ${isPostgres ? "PostgreSQL" : "SQLite"} → ${schema}`);

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", ...process.argv.slice(2), "--schema", schema],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
