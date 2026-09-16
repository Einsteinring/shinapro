"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PerWheelService } from "@/config/pricing";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { CalculatorSummary } from "@/components/calculator/calculator-summary";
import { useBookingDraft } from "@/components/booking/booking-draft-context";
import {
  calculatePrice,
  createSnapshot,
  DEFAULT_CALCULATOR_INPUT,
  type CalculatorInput,
} from "@/lib/calculator";
import {
  inputToSearchParams,
  searchParamsToInput,
  stripCalculatorParams,
} from "@/lib/calculator-url";

/**
 * Калькулятор: однооконный с живым пересчётом.
 * Начальное состояние берётся из query-параметров (useSearchParams, поэтому компонент
 * обёрнут в Suspense в секции), дальше состояние живёт в React и зеркалится в URL
 * через history.replaceState, чтобы ссылкой можно было делиться.
 */
export function Calculator() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState<CalculatorInput>(() => searchParamsToInput(searchParams));
  const [copied, setCopied] = useState(false);
  const { attachCalculation } = useBookingDraft();

  // Пишем состояние в URL при каждом изменении, не трогая чужие параметры (utm и т. п.)
  useEffect(() => {
    const next = stripCalculatorParams(new URLSearchParams(window.location.search));
    for (const [key, value] of inputToSearchParams(input)) next.set(key, value);
    const query = next.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [input]);

  const result = useMemo(() => calculatePrice(input), [input]);

  const update = useCallback((patch: Partial<CalculatorInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleService = useCallback((id: PerWheelService, checked: boolean) => {
    setInput((prev) => ({ ...prev, services: { ...prev.services, [id]: checked } }));
  }, []);

  const handleBook = () => {
    attachCalculation(createSnapshot(input));
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Переводим фокус на первое поле формы после прокрутки
    window.setTimeout(
      () => document.getElementById("booking-name")?.focus({ preventScroll: true }),
      600,
    );
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${inputToSearchParams(input)}#calculator`;
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Расчёт стоимости шиномонтажа", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Пользователь закрыл диалог или буфер недоступен: молча игнорируем
    }
  };

  const handleReset = () => setInput(DEFAULT_CALCULATOR_INPUT);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start xl:grid-cols-[1fr_440px]">
      <CalculatorForm input={input} onChange={update} onToggleService={toggleService} />
      <CalculatorSummary
        input={input}
        result={result}
        onBook={handleBook}
        onShare={handleShare}
        onReset={handleReset}
        copied={copied}
      />
    </div>
  );
}
