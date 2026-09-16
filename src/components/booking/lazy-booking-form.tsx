"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * Форма записи тянет react-hook-form и zod (~40 КБ gzip). Эти байты не нужны
 * для первого экрана, поэтому чанк грузится, когда секция записи приближается
 * к viewport, либо сразу, если пользователь пришёл по якорю #booking.
 */
const BookingForm = dynamic(
  () => import("@/components/booking/booking-form").then((m) => m.BookingForm),
  { ssr: false, loading: () => <FormSkeleton /> },
);

function FormSkeleton() {
  return (
    <div
      className="flex min-h-[720px] flex-col gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-8"
      role="status"
      aria-label="Загружаем форму записи"
    >
      {[44, 44, 96, 44, 200, 96].map((h, i) => (
        <div key={i} className="animate-pulse-soft rounded-xl bg-surface-2" style={{ height: h }} />
      ))}
    </div>
  );
}

export function LazyBookingForm() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.location.hash === "#booking" || !("IntersectionObserver" in window)) {
      // Пришли по якорю или нет IO — грузим сразу
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
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? <BookingForm /> : <FormSkeleton />}</div>;
}
