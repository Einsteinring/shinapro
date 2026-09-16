"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Подпись рядом с числом: «мес.», «шт.» */
  unit?: string;
  className?: string;
}

/** Числовой степпер с кнопками ±. Число редактируется и с клавиатуры (стрелки, ввод). */
export function Stepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  unit,
  className,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:border-fg/30 disabled:opacity-40 disabled:hover:border-border";

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] leading-tight font-semibold">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Уменьшить: ${label}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            className="tabular h-10 w-12 [appearance:textfield] rounded-lg border-0 bg-transparent text-center text-lg font-bold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`Увеличить: ${label}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
