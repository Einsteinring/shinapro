import { describe, expect, it } from "vitest";
import { DEFAULT_CALCULATOR_INPUT, type CalculatorInput } from "@/lib/calculator";
import {
  hasCalculatorParams,
  inputToSearchParams,
  searchParamsToInput,
  stripCalculatorParams,
} from "@/lib/calculator-url";

describe("calculator-url", () => {
  it("дефолтное состояние даёт пустой query", () => {
    expect(inputToSearchParams(DEFAULT_CALCULATOR_INPUT).toString()).toBe("");
  });

  it("сериализует только отличия от дефолта", () => {
    const params = inputToSearchParams({
      ...DEFAULT_CALCULATOR_INPUT,
      vehicle: "suv",
      radius: 17,
      punctures: 1,
      urgent: true,
    });
    expect(params.toString()).toBe("v=suv&r=17&p=1&urg=1");
  });

  it("round-trip сохраняет состояние", () => {
    const input: CalculatorInput = {
      vehicle: "lcv",
      radius: 20,
      wheelType: "lowprofile",
      wheels: 2,
      discs: 0,
      services: {
        removeInstall: false,
        mountDemount: true,
        balancing: true,
        wash: true,
        bags: false,
      },
      punctures: 2,
      storageMonths: 7,
      homeVisit: true,
      urgent: true,
    };
    const restored = searchParamsToInput(inputToSearchParams(input));
    expect(restored).toEqual(input);
  });

  it("кодирует пустой набор услуг явно, чтобы отличать от дефолта", () => {
    const input = {
      ...DEFAULT_CALCULATOR_INPUT,
      services: {
        ...DEFAULT_CALCULATOR_INPUT.services,
        removeInstall: false,
        mountDemount: false,
        balancing: false,
      },
    };
    const params = inputToSearchParams(input);
    expect(params.get("s")).toBe("none");
    expect(searchParamsToInput(params).services).toEqual(input.services);
  });

  it("игнорирует мусор и неизвестные коды услуг", () => {
    const restored = searchParamsToInput(
      new URLSearchParams("v=boat&r=99&s=bal,zzz&p=abc&home=yes"),
    );
    expect(restored.vehicle).toBe("sedan");
    expect(restored.radius).toBe(16);
    expect(restored.services).toEqual({
      removeInstall: false,
      mountDemount: false,
      balancing: true,
      wash: false,
      bags: false,
    });
    expect(restored.punctures).toBe(0);
    expect(restored.homeVisit).toBe(false);
  });

  it("определяет наличие параметров и умеет их вырезать", () => {
    const params = new URLSearchParams("utm_source=vk&r=18");
    expect(hasCalculatorParams(params)).toBe(true);
    expect(hasCalculatorParams(new URLSearchParams("utm_source=vk"))).toBe(false);
    expect(stripCalculatorParams(params).toString()).toBe("utm_source=vk");
  });
});
