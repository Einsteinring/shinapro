"use client";

import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface ChoiceGroupProps<T extends string | number> {
  name: string;
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** compact — короткие чипы в одну строку (радиус, количество), cards — карточки с подсказкой */
  variant?: "compact" | "cards";
  columns?: 2 | 3 | 4;
}

/**
 * Группа radio-кнопок, стилизованная под чипы/карточки. Нативные input сохраняют
 * навигацию стрелками и доступность, визуально скрыты.
 */
export function ChoiceGroup<T extends string | number>({
  name,
  label,
  options,
  value,
  onChange,
  variant = "cards",
  columns = 2,
}: ChoiceGroupProps<T>) {
  const gridCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[columns];

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-sm font-semibold">{label}</legend>
      <div
        className={cn(
          variant === "cards" ? cn("grid grid-cols-1 gap-2", gridCols) : "flex flex-wrap gap-2",
        )}
      >
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              htmlFor={id}
              className={cn(
                "relative cursor-pointer border transition-all duration-150 select-none",
                "hover:border-fg/30 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                checked ? "border-accent bg-accent-soft" : "border-border bg-surface",
                variant === "cards"
                  ? "flex flex-col gap-0.5 rounded-xl px-3.5 py-3"
                  : "flex h-10 min-w-12 items-center justify-center rounded-full px-4 text-sm font-semibold",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                className={cn(variant === "cards" ? "text-[15px] leading-tight font-semibold" : "")}
              >
                {option.label}
              </span>
              {option.hint && variant === "cards" && (
                <span className="text-xs leading-snug text-muted">{option.hint}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
