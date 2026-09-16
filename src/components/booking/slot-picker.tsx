"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@/lib/slots";
import { cn } from "@/lib/utils";

interface SlotPickerProps {
  branchId: string;
  date: string;
  value: string;
  onChange: (time: string) => void;
  error?: string;
  /** Изменение значения принудительно перезапрашивает слоты (после 409 от сервера) */
  refreshKey?: number;
}

interface Loaded {
  /** Ключ запроса, для которого получены данные */
  key: string;
  slots: Slot[];
  open: boolean;
  failed: boolean;
}

/**
 * Выбор времени. Состояние загрузки выводится из сравнения ключа запроса
 * с ключом загруженных данных, поэтому эффект только запрашивает данные.
 */
export function SlotPicker({
  branchId,
  date,
  value,
  onChange,
  error,
  refreshKey = 0,
}: SlotPickerProps) {
  const requestKey = branchId && date ? `${branchId}|${date}|${refreshKey}` : "";
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    const [branch, day] = requestKey.split("|") as [string, string, string];
    const controller = new AbortController();

    fetch(`/api/slots?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(day)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { slots: Slot[]; open: boolean };
        setLoaded({ key: requestKey, slots: data.slots, open: data.open, failed: false });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoaded({ key: requestKey, slots: [], open: false, failed: true });
      });

    return () => controller.abort();
  }, [requestKey]);

  const idle = !requestKey;
  const ready = !idle && loaded?.key === requestKey ? loaded : null;
  const loading = !idle && !ready;

  // Сбрасываем выбранное время, если после перезапроса оно оказалось занято
  useEffect(() => {
    if (!ready || ready.failed || !value) return;
    const stillFree = ready.slots.some((s) => s.time === value && s.available);
    if (!stillFree) onChange("");
  }, [ready, value, onChange]);

  const describedBy = error ? "booking-time-error" : "booking-time-hint";

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-2 text-sm font-semibold">
        Время{" "}
        <span className="text-accent-text" aria-hidden="true">
          *
        </span>
      </legend>

      {idle && (
        <p id="booking-time-hint" className="text-sm text-muted">
          Сначала выберите филиал и дату.
        </p>
      )}

      {loading && (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
          aria-busy="true"
          role="status"
          aria-label="Загружаем свободные слоты"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse-soft rounded-full bg-surface-2" />
          ))}
        </div>
      )}

      {ready?.failed && (
        <p className="text-sm text-danger" role="alert">
          Не удалось загрузить слоты. Проверьте соединение и попробуйте ещё раз.
        </p>
      )}

      {ready && !ready.failed && !ready.open && (
        <p id="booking-time-hint" className="text-sm text-danger">
          В этот день филиал не работает. Выберите другую дату или филиал.
        </p>
      )}

      {ready && !ready.failed && ready.open && (
        <>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ready.slots.map((slot) => {
              const id = `slot-${slot.time.replace(":", "")}`;
              const checked = value === slot.time;
              return (
                <label
                  key={slot.time}
                  htmlFor={id}
                  className={cn(
                    "tabular flex h-10 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-colors select-none",
                    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                    !slot.available && "cursor-not-allowed text-muted line-through opacity-50",
                    slot.available && !checked && "border-border bg-surface hover:border-fg/30",
                    checked && "border-accent bg-accent text-accent-fg",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name="time"
                    value={slot.time}
                    checked={checked}
                    disabled={!slot.available}
                    onChange={() => onChange(slot.time)}
                    className="sr-only"
                  />
                  {slot.time}
                </label>
              );
            })}
          </div>
          <p id="booking-time-hint" className="mt-2 text-sm text-muted">
            {ready.slots.every((s) => !s.available)
              ? "Свободных слотов на этот день нет. Попробуйте другую дату."
              : "Слот 30 минут. Зачёркнутые уже заняты."}
          </p>
        </>
      )}

      {error && (
        <p id="booking-time-error" className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
