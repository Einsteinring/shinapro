/**
 * Сериализация состояния калькулятора в query-параметры и обратно.
 * Ключи короткие, чтобы ссылка оставалась читаемой:
 *   ?v=suv&r=17&wt=alloy&n=4&s=ri,md,bal&p=1&st=6&home=1&urg=1
 * Значения по умолчанию в URL не пишутся.
 */
import { PER_WHEEL_SERVICES, type PerWheelService } from "@/config/pricing";
import { DEFAULT_CALCULATOR_INPUT, normalizeInput, type CalculatorInput } from "@/lib/calculator";

export const CALC_KEYS = {
  vehicle: "v",
  radius: "r",
  wheelType: "wt",
  wheels: "n",
  services: "s",
  punctures: "p",
  storageMonths: "st",
  homeVisit: "home",
  urgent: "urg",
} as const;

const SERVICE_CODES: Record<PerWheelService, string> = {
  removeInstall: "ri",
  mountDemount: "md",
  balancing: "bal",
  wash: "wash",
  bags: "bags",
};

const CODE_TO_SERVICE = Object.fromEntries(
  Object.entries(SERVICE_CODES).map(([service, code]) => [code, service]),
) as Record<string, PerWheelService>;

export function inputToSearchParams(input: CalculatorInput): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_CALCULATOR_INPUT;

  if (input.vehicle !== d.vehicle) params.set(CALC_KEYS.vehicle, input.vehicle);
  if (input.radius !== d.radius) params.set(CALC_KEYS.radius, String(input.radius));
  if (input.wheelType !== d.wheelType) params.set(CALC_KEYS.wheelType, input.wheelType);
  if (input.wheels !== d.wheels) params.set(CALC_KEYS.wheels, String(input.wheels));

  const selected = PER_WHEEL_SERVICES.filter((id) => input.services[id]);
  const defaultSelected = PER_WHEEL_SERVICES.filter((id) => d.services[id]);
  if (selected.join() !== defaultSelected.join()) {
    params.set(
      CALC_KEYS.services,
      selected.length ? selected.map((id) => SERVICE_CODES[id]).join(",") : "none",
    );
  }

  if (input.punctures > 0) params.set(CALC_KEYS.punctures, String(input.punctures));
  if (input.storageMonths > 0) params.set(CALC_KEYS.storageMonths, String(input.storageMonths));
  if (input.homeVisit) params.set(CALC_KEYS.homeVisit, "1");
  if (input.urgent) params.set(CALC_KEYS.urgent, "1");

  return params;
}

export function searchParamsToInput(params: URLSearchParams): CalculatorInput {
  const servicesParam = params.get(CALC_KEYS.services);
  let services: Record<PerWheelService, boolean> | undefined;

  if (servicesParam !== null) {
    const codes = servicesParam === "none" ? [] : servicesParam.split(",");
    services = Object.fromEntries(PER_WHEEL_SERVICES.map((id) => [id, false])) as Record<
      PerWheelService,
      boolean
    >;
    for (const code of codes) {
      const service = CODE_TO_SERVICE[code.trim()];
      if (service) services[service] = true;
    }
  }

  return normalizeInput({
    vehicle: params.get(CALC_KEYS.vehicle) ?? undefined,
    radius: params.get(CALC_KEYS.radius) ?? undefined,
    wheelType: params.get(CALC_KEYS.wheelType) ?? undefined,
    wheels: params.get(CALC_KEYS.wheels) ?? undefined,
    services,
    punctures: params.get(CALC_KEYS.punctures) ?? undefined,
    storageMonths: params.get(CALC_KEYS.storageMonths) ?? undefined,
    homeVisit: params.get(CALC_KEYS.homeVisit) === "1",
    urgent: params.get(CALC_KEYS.urgent) === "1",
  });
}

/** Есть ли в URL хоть один параметр калькулятора (чтобы понять, пришёл ли пользователь по ссылке) */
export function hasCalculatorParams(params: URLSearchParams): boolean {
  return Object.values(CALC_KEYS).some((key) => params.has(key));
}

/** Удаляет ключи калькулятора из набора параметров, не трогая остальные */
export function stripCalculatorParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of Object.values(CALC_KEYS)) next.delete(key);
  return next;
}
