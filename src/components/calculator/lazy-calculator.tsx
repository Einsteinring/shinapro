"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { hasCalculatorParams } from "@/lib/calculator-url";

/**
 * Калькулятор целиком интерактивный (три десятка полей), поэтому его гидратация
 * не нужна на первом экране. Чанк подгружается, когда секция приближается к viewport,
 * либо сразу, если пользователь пришёл по ссылке с параметрами расчёта или якорем #calculator.
 */
const Calculator = dynamic(
  () => import("@/components/calculator/calculator").then((m) => m.Calculator),
  { ssr: false, loading: () => <CalculatorSkeleton /> },
);

export function CalculatorSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]"
      role="status"
      aria-label="Загружаем калькулятор"
    >
      <div className="flex flex-col gap-4">
        {[420, 520, 180].map((h) => (
          <div
            key={h}
            className="animate-pulse-soft rounded-3xl border border-border bg-surface"
            style={{ height: h }}
          />
        ))}
      </div>
      <div className="h-[520px] animate-pulse-soft rounded-3xl border border-border bg-surface" />
    </div>
  );
}

export function LazyCalculator() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const eager =
      window.location.hash === "#calculator" ||
      hasCalculatorParams(new URLSearchParams(window.location.search)) ||
      !("IntersectionObserver" in window);

    if (eager) {
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? <Calculator /> : <CalculatorSkeleton />}</div>;
}
