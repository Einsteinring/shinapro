"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
  /** Форматирование итогового текста; по умолчанию разряды через пробел */
  format?: (value: number) => string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Плавно «докручивает» число до нового значения через requestAnimationFrame.
 * Уважает prefers-reduced-motion: тогда значение меняется за один кадр.
 * Скринридеру всегда доступно финальное значение (visually-hidden span),
 * анимируемая копия скрыта через aria-hidden.
 */
export function AnimatedNumber({
  value,
  durationMs = 600,
  className,
  format = formatNumber,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : durationMs;
    const from = displayRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const current = Math.round(from + (value - from) * easeOutCubic(progress));
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true" className="tabular">
        {format(display)}
      </span>
    </span>
  );
}
