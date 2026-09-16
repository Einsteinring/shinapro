import { describe, expect, it } from "vitest";
import { formatPhoneInput, normalizePhone, PHONE_MASK_RE } from "@/lib/phone";

describe("phone mask", () => {
  it("форматирует по мере ввода", () => {
    expect(formatPhoneInput("")).toBe("");
    expect(formatPhoneInput("9")).toBe("+7 (9");
    expect(formatPhoneInput("912")).toBe("+7 (912) ");
    expect(formatPhoneInput("9123")).toBe("+7 (912) 3");
    expect(formatPhoneInput("912345")).toBe("+7 (912) 345-");
    expect(formatPhoneInput("91234567")).toBe("+7 (912) 345-67-");
    expect(formatPhoneInput("9123456789")).toBe("+7 (912) 345-67-89");
  });

  it("понимает 8 и +7 в начале и лишние цифры", () => {
    expect(formatPhoneInput("89123456789")).toBe("+7 (912) 345-67-89");
    expect(formatPhoneInput("+7 912 345 67 89")).toBe("+7 (912) 345-67-89");
    expect(formatPhoneInput("7912345678912345")).toBe("+7 (912) 345-67-89");
  });

  it("результат полной маски проходит регулярку схемы", () => {
    expect(PHONE_MASK_RE.test(formatPhoneInput("9123456789"))).toBe(true);
    expect(PHONE_MASK_RE.test(formatPhoneInput("912345678"))).toBe(false);
  });

  it("нормализует к E.164", () => {
    expect(normalizePhone("+7 (912) 345-67-89")).toBe("+79123456789");
  });
});
