"use client";

import { Calculator, X } from "lucide-react";
import Link from "next/link";
import type { CalculationSnapshot } from "@/lib/calculator";
import { formatPrice } from "@/lib/format";

interface CalculationAttachmentProps {
  calculation: CalculationSnapshot;
  onDetach: () => void;
}

/** Карточка «прикреплённый расчёт» в форме заявки */
export function CalculationAttachment({ calculation, onDetach }: CalculationAttachmentProps) {
  return (
    <div
      className="rounded-2xl border border-accent/40 bg-accent-soft p-4"
      role="group"
      aria-label="Прикреплённый расчёт"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">
            <Calculator className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Расчёт из калькулятора прикреплён</p>
            <p className="text-xs text-muted">{calculation.summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDetach}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-fg"
          aria-label="Открепить расчёт"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {calculation.lines.map((line) => (
          <li key={line.label} className="flex justify-between gap-3">
            <span className="text-muted">
              {line.label} × {line.qty}
            </span>
            <span className="tabular font-medium">{formatPrice(line.total)}</span>
          </li>
        ))}
        {calculation.discounts.map((d) => (
          <li key={d.label} className="flex justify-between gap-3 text-accent-text">
            <span>{d.label}</span>
            <span className="tabular font-medium">−{formatPrice(d.amount)}</span>
          </li>
        ))}
        {calculation.urgencyFee > 0 && (
          <li className="flex justify-between gap-3">
            <span className="text-muted">Срочность</span>
            <span className="tabular font-medium">+{formatPrice(calculation.urgencyFee)}</span>
          </li>
        )}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-accent/30 pt-3">
        <span className="text-sm font-semibold">Итого ориентировочно</span>
        <span className="tabular font-heading text-lg font-bold">
          {formatPrice(calculation.total)}
        </span>
      </div>
      <Link
        href="/#calculator"
        className="mt-2 inline-block text-xs font-semibold text-accent-text underline-offset-2 hover:underline"
      >
        Изменить расчёт
      </Link>
    </div>
  );
}
