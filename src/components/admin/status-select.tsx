"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOKING_STATUS_LABELS, BOOKING_STATUSES, type BookingStatus } from "@/lib/schemas/booking";
import { cn } from "@/lib/utils";

const tones: Record<BookingStatus, string> = {
  new: "bg-accent-soft text-accent-text border-accent/40",
  confirmed: "bg-success/12 text-success border-success/40",
  done: "bg-surface-2 text-muted border-border",
  cancelled: "bg-danger/10 text-danger border-danger/40",
};

export function StatusSelect({ id, status }: { id: number; status: BookingStatus }) {
  const router = useRouter();
  const [value, setValue] = useState<BookingStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const onChange = async (next: BookingStatus) => {
    const previous = value;
    setValue(next);
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      setValue(previous);
      setError(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BookingStatus)}
        disabled={pending}
        aria-label={`Статус заявки ${id}`}
        className={cn(
          "h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-60",
          tones[value],
        )}
      >
        {BOOKING_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-surface text-fg">
            {BOOKING_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-danger" role="alert">
          Не сохранилось
        </span>
      )}
    </div>
  );
}
