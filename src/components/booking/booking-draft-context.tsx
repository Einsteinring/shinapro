"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CalculationSnapshot } from "@/lib/calculator";

interface BookingDraft {
  calculation: CalculationSnapshot | null;
  attachCalculation: (snapshot: CalculationSnapshot) => void;
  detachCalculation: () => void;
}

const BookingDraftContext = createContext<BookingDraft | null>(null);

/**
 * Связывает калькулятор и форму записи: «Записаться с этим расчётом» кладёт снимок сюда,
 * форма показывает его как вложение и отправляет вместе с заявкой.
 */
export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [calculation, setCalculation] = useState<CalculationSnapshot | null>(null);

  const attachCalculation = useCallback(
    (snapshot: CalculationSnapshot) => setCalculation(snapshot),
    [],
  );
  const detachCalculation = useCallback(() => setCalculation(null), []);

  const value = useMemo(
    () => ({ calculation, attachCalculation, detachCalculation }),
    [calculation, attachCalculation, detachCalculation],
  );

  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft(): BookingDraft {
  const ctx = useContext(BookingDraftContext);
  if (!ctx) throw new Error("useBookingDraft должен использоваться внутри BookingDraftProvider");
  return ctx;
}
