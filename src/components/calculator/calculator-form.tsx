"use client";

import {
  PER_WHEEL_SERVICES,
  pricing,
  RADII,
  VEHICLE_TYPES,
  WHEEL_COUNTS,
  WHEEL_TYPES,
  type PerWheelService,
} from "@/config/pricing";
import { Checkbox } from "@/components/ui/field";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Stepper } from "@/components/ui/stepper";
import { getUnitPrice, type CalculatorInput } from "@/lib/calculator";
import { formatPrice } from "@/lib/format";

interface CalculatorFormProps {
  input: CalculatorInput;
  onChange: (patch: Partial<CalculatorInput>) => void;
  onToggleService: (id: PerWheelService, checked: boolean) => void;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

/** Цена за единицу для подписи в чекбоксе услуги */
function unitPriceFor(id: PerWheelService, input: CalculatorInput): number {
  if (id === "wash" || id === "bags") return pricing.perWheelFlat[id];
  return getUnitPrice(id, input);
}

export function CalculatorForm({ input, onChange, onToggleService }: CalculatorFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Group title="1. Автомобиль и колёса">
        <ChoiceGroup
          name="vehicle"
          label="Тип автомобиля"
          options={VEHICLE_TYPES.map((v) => ({
            value: v,
            label: pricing.vehicle[v].label,
            hint: pricing.vehicle[v].hint,
          }))}
          value={input.vehicle}
          onChange={(vehicle) => onChange({ vehicle })}
          columns={2}
        />
        <ChoiceGroup
          name="radius"
          label="Радиус дисков"
          options={RADII.map((r) => ({ value: r, label: `R${r}` }))}
          value={input.radius}
          onChange={(radius) => onChange({ radius })}
          variant="compact"
        />
        <ChoiceGroup
          name="wheelType"
          label="Тип дисков"
          options={WHEEL_TYPES.map((w) => ({
            value: w,
            label: pricing.wheelType[w].label,
            hint: pricing.wheelType[w].hint,
          }))}
          value={input.wheelType}
          onChange={(wheelType) => onChange({ wheelType })}
          columns={3}
        />
        <ChoiceGroup
          name="wheels"
          label="Количество колёс"
          options={WHEEL_COUNTS.map((n) => ({ value: n, label: String(n) }))}
          value={input.wheels}
          onChange={(wheels) => onChange({ wheels })}
          variant="compact"
        />
      </Group>

      <Group title="2. Услуги">
        <fieldset>
          <legend className="sr-only">Услуги за колесо</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PER_WHEEL_SERVICES.map((id) => (
              <Checkbox
                key={id}
                id={`service-${id}`}
                name={id}
                checked={input.services[id]}
                onChange={(e) => onToggleService(id, e.target.checked)}
                label={
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span>{pricing.services[id].label}</span>
                    <span className="text-sm font-bold whitespace-nowrap text-accent-text">
                      {formatPrice(unitPriceFor(id, input))}
                      <span className="font-normal text-muted"> / колесо</span>
                    </span>
                  </span>
                }
                description={pricing.services[id].hint}
              />
            ))}
          </div>
        </fieldset>

        <div className="divide-y divide-border rounded-2xl border border-border px-4">
          <Stepper
            id="punctures"
            label={pricing.puncture.label}
            hint={`${pricing.puncture.hint} · ${formatPrice(getUnitPrice("punctureRepair", input))} за прокол`}
            value={input.punctures}
            min={0}
            max={pricing.puncture.max}
            onChange={(punctures) => onChange({ punctures })}
            unit="шт."
            className="py-3.5"
          />
          <Stepper
            id="storageMonths"
            label={pricing.storage.label}
            hint={`${pricing.storage.hint} · ${formatPrice(pricing.storage.perWheelPerMonth)} за колесо в месяц, от ${pricing.storage.longTermFrom} мес. скидка ${pricing.storage.longTermDiscountPercent}%`}
            value={input.storageMonths}
            min={0}
            max={pricing.storage.maxMonths}
            onChange={(storageMonths) => onChange({ storageMonths })}
            unit="мес."
            className="py-3.5"
          />
        </div>
      </Group>

      <Group title="3. Дополнительно">
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            id="homeVisit"
            name="homeVisit"
            checked={input.homeVisit}
            onChange={(e) => onChange({ homeVisit: e.target.checked })}
            label={
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>{pricing.extras.homeVisit.label}</span>
                <span className="text-sm font-bold text-accent-text">
                  +{formatPrice(pricing.extras.homeVisit.price)}
                </span>
              </span>
            }
            description={pricing.extras.homeVisit.hint}
          />
          <Checkbox
            id="urgent"
            name="urgent"
            checked={input.urgent}
            onChange={(e) => onChange({ urgent: e.target.checked })}
            label={
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>{pricing.extras.urgent.label}</span>
                <span className="text-sm font-bold text-accent-text">
                  +{pricing.extras.urgent.percent}%
                </span>
              </span>
            }
            description={pricing.extras.urgent.hint}
          />
        </div>
      </Group>
    </div>
  );
}
