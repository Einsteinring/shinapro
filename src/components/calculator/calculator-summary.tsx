"use client";

import { CalendarCheck, Check, Info, Link2, RotateCcw } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import type { CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { describeInput } from "@/lib/calculator";
import { formatPrice } from "@/lib/format";

interface CalculatorSummaryProps {
  input: CalculatorInput;
  result: CalculatorResult;
  onBook: () => void;
  onShare: () => void;
  onReset: () => void;
  copied: boolean;
}

export function CalculatorSummary({
  input,
  result,
  onBook,
  onShare,
  onReset,
  copied,
}: CalculatorSummaryProps) {
  const empty = result.lines.length === 0;

  return (
    <aside
      className="flex flex-col rounded-3xl bg-fg p-6 text-bg shadow-card lg:sticky lg:top-24"
      aria-labelledby="summary-title"
    >
      <p className="text-xs font-semibold tracking-wide text-accent uppercase">
        Итого ориентировочно
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <AnimatedNumber
          value={result.total}
          className="font-heading text-[2.6rem] leading-none font-extrabold sm:text-5xl"
        />
        <span className="font-heading text-2xl font-bold">₽</span>
      </p>
      <p className="mt-2 text-sm opacity-70" id="summary-title">
        {describeInput(input)}
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl bg-white/5">
        {empty ? (
          <p className="p-4 text-sm opacity-70">
            Выберите хотя бы одну услугу, и здесь появится детализация.
          </p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Детализация расчёта: услуга, количество, цена, сумма
            </caption>
            <thead>
              <tr className="text-left text-xs opacity-60">
                <th scope="col" className="px-4 pt-3 pb-2 font-medium">
                  Услуга
                </th>
                <th scope="col" className="px-2 pt-3 pb-2 text-right font-medium">
                  Кол-во
                </th>
                <th
                  scope="col"
                  className="hidden px-2 pt-3 pb-2 text-right font-medium sm:table-cell"
                >
                  Цена
                </th>
                <th scope="col" className="px-4 pt-3 pb-2 text-right font-medium">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {result.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5">{line.label}</td>
                  <td className="tabular px-2 py-2.5 text-right whitespace-nowrap opacity-80">
                    {line.qty} <span className="text-xs opacity-70">{line.unit}</span>
                  </td>
                  <td className="tabular hidden px-2 py-2.5 text-right whitespace-nowrap opacity-80 sm:table-cell">
                    {formatPrice(line.unitPrice)}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                    {formatPrice(line.total)}
                  </td>
                </tr>
              ))}
              {result.discounts.map((d) => (
                <tr key={d.id} className="text-accent">
                  <td className="px-4 py-2.5" colSpan={3}>
                    {d.label}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                    −{formatPrice(d.amount)}
                  </td>
                </tr>
              ))}
              {result.urgencyFee > 0 && (
                <tr>
                  <td className="px-4 py-2.5" colSpan={3}>
                    Срочность, без очереди
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                    +{formatPrice(result.urgencyFee)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20">
                <th scope="row" className="px-4 py-3 text-left font-semibold" colSpan={3}>
                  Итого
                </th>
                <td className="tabular px-4 py-3 text-right text-base font-bold whitespace-nowrap">
                  {formatPrice(result.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs opacity-70">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Цена ориентировочная, итоговая сумма после осмотра автомобиля. Все изменения согласуем до
        начала работ.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <Button size="lg" onClick={onBook} disabled={empty} className="w-full">
          <CalendarCheck className="size-5" aria-hidden="true" />
          Записаться с этим расчётом
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={onShare}
            className="border-white/20 text-bg hover:border-white/50 hover:bg-white/5"
            aria-live="polite"
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Link2 className="size-4" aria-hidden="true" />
            )}
            {copied ? "Скопировано" : "Поделиться"}
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="border-white/20 text-bg hover:border-white/50 hover:bg-white/5"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Сбросить
          </Button>
        </div>
      </div>
    </aside>
  );
}
