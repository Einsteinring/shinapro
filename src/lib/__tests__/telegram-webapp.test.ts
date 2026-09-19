/**
 * Проверка подписи initData.
 *
 * Подпись для тестов собирается здесь заново, по документации Telegram, а не через
 * проверяемый код: тест, который готовит данные тем же кодом, проверяет сам себя.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InitDataError, verifyInitData } from "@/lib/telegram-webapp";

const TOKEN = "123456:TEST-TOKEN-FOR-UNIT-TESTS";
const USER = { id: 874512394, first_name: "Иван", last_name: "Князев", language_code: "ru" };

function sign(fields: Record<string, string>, token = TOKEN): string {
  const check = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

function initData(
  overrides: {
    user?: object;
    authDate?: number;
    token?: string;
    extra?: Record<string, string>;
  } = {},
) {
  return sign(
    {
      user: JSON.stringify(overrides.user ?? USER),
      auth_date: String(overrides.authDate ?? Math.floor(Date.now() / 1000)),
      query_id: "AAHdFpIQAAAAAN0WkhDhrOrc",
      ...(overrides.extra ?? {}),
    },
    overrides.token ?? TOKEN,
  );
}

describe("verifyInitData", () => {
  it("принимает подписанные данные и возвращает пользователя", () => {
    const user = verifyInitData(initData(), { botToken: TOKEN });
    expect(user.id).toBe(USER.id);
    expect(user.first_name).toBe("Иван");
  });

  it("считает hash вместе с полем signature — иначе новые клиенты не проходят", () => {
    const data = initData({ extra: { signature: "Ed25519-подпись-для-сторонней-проверки" } });
    expect(verifyInitData(data, { botToken: TOKEN }).id).toBe(USER.id);
  });

  it("отклоняет подменённый Telegram id", () => {
    const forged = initData().replace(String(USER.id), "999999999");
    expect(() => verifyInitData(forged, { botToken: TOKEN })).toThrow(InitDataError);
  });

  it("отклоняет подменённый auth_date", () => {
    const honest = initData({ authDate: 1_700_000_000 });
    const forged = honest.replace("1700000000", "1700009999");
    expect(() => verifyInitData(forged, { botToken: TOKEN })).toThrow(InitDataError);
  });

  it("отклоняет hash от другой валидной строки", () => {
    const other = initData({ user: { id: 111, first_name: "Пётр" } });
    const forged = `${initData().split("&hash=")[0]}&hash=${other.split("&hash=")[1]}`;
    expect(() => verifyInitData(forged, { botToken: TOKEN })).toThrow(InitDataError);
  });

  it("отклоняет подпись чужим токеном", () => {
    expect(() => verifyInitData(initData(), { botToken: "999:ANOTHER-BOT" })).toThrow(
      InitDataError,
    );
  });

  it("отклоняет данные старше суток", () => {
    const stale = initData({ authDate: Math.floor(Date.now() / 1000) - 25 * 3600 });
    expect(() => verifyInitData(stale, { botToken: TOKEN })).toThrow(/просрочен/);
  });

  it("принимает данные возрастом 23 часа", () => {
    const fresh = initData({ authDate: Math.floor(Date.now() / 1000) - 23 * 3600 });
    expect(verifyInitData(fresh, { botToken: TOKEN }).id).toBe(USER.id);
  });

  it("отклоняет auth_date из будущего", () => {
    const future = initData({ authDate: Math.floor(Date.now() / 1000) + 3600 });
    expect(() => verifyInitData(future, { botToken: TOKEN })).toThrow(/будущего/);
  });

  it("отклоняет пустые данные и данные без hash", () => {
    expect(() => verifyInitData("", { botToken: TOKEN })).toThrow(InitDataError);
    expect(() =>
      verifyInitData("user=%7B%22id%22%3A1%7D&auth_date=1700000000", { botToken: TOKEN }),
    ).toThrow(/нет hash/);
  });

  it("отклоняет данные без пользователя", () => {
    const data = sign({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: "AA" });
    expect(() => verifyInitData(data, { botToken: TOKEN })).toThrow(/нет пользователя/);
  });
});
