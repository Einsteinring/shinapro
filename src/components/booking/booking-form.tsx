"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { branches } from "@/config/site";
import { useBookingDraft } from "@/components/booking/booking-draft-context";
import { CalculationAttachment } from "@/components/booking/calculation-attachment";
import { PhoneInput } from "@/components/booking/phone-input";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Checkbox, describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { formatDateRu } from "@/lib/dates";
import { bookingSchema, type BookingFormValues } from "@/lib/schemas/booking";
import { getBookingDateRange } from "@/lib/slots";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; number: string; date: string; time: string; branchId: string }
  | { status: "error"; message: string };

interface ApiSuccess {
  ok: true;
  booking: { id: number; number: string; date: string; time: string; branchId: string };
}
interface ApiError {
  ok: false;
  error: string;
  message?: string;
}

export function BookingForm() {
  const { calculation, detachCalculation } = useBookingDraft();
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [slotsRefresh, setSlotsRefresh] = useState(0);
  const range = useMemo(() => getBookingDateRange(new Date()), []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      car: "",
      branchId: "moskovskaya",
      date: "",
      time: "",
      comment: "",
      consent: false as unknown as true,
      website: "",
      calculation: null,
    },
  });

  const branchId = watch("branchId");
  const date = watch("date");

  const onSubmit = useCallback(
    async (values: BookingFormValues) => {
      setSubmit({ status: "submitting" });
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, calculation }),
        });
        const data = (await res.json()) as ApiSuccess | ApiError;

        if (res.ok && data.ok) {
          setSubmit({ status: "success", ...data.booking });
          reset();
          detachCalculation();
          return;
        }

        if (!data.ok && data.error === "slot_taken") {
          setError("time", { message: data.message ?? "Это время уже заняли, выберите другое" });
          setSlotsRefresh((n) => n + 1);
          setSubmit({ status: "idle" });
          return;
        }

        setSubmit({
          status: "error",
          message:
            (!data.ok && data.message) ||
            "Не получилось отправить заявку. Попробуйте ещё раз или позвоните нам.",
        });
      } catch {
        setSubmit({
          status: "error",
          message: "Нет соединения с сервером. Проверьте интернет и повторите.",
        });
      }
    },
    [calculation, detachCalculation, reset, setError],
  );

  if (submit.status === "success") {
    const branch = branches.find((b) => b.id === submit.branchId);
    return (
      <div
        className="rounded-3xl border border-border bg-surface p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-2xl font-bold">Заявка принята</h3>
        <p className="mt-2 text-muted">
          Номер заявки <strong className="font-heading text-fg">{submit.number}</strong>
        </p>
        <p className="mt-4 text-lg">
          {formatDateRu(submit.date)}, {submit.time}
        </p>
        <p className="text-muted">{branch?.name}</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          Перезвоним или напишем для подтверждения в течение 15 минут в рабочее время. Если планы
          изменятся, просто позвоните.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => setSubmit({ status: "idle" })}>
          Записать ещё
        </Button>
      </div>
    );
  }

  const busy = submit.status === "submitting";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-8"
      aria-describedby="booking-form-note"
    >
      {calculation && (
        <CalculationAttachment calculation={calculation} onDetach={detachCalculation} />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="booking-name" label="Имя" required error={errors.name?.message}>
          <Input
            id="booking-name"
            autoComplete="given-name"
            placeholder="Как к вам обращаться"
            invalid={Boolean(errors.name)}
            aria-describedby={describedBy("booking-name", Boolean(errors.name), false)}
            {...register("name")}
          />
        </Field>

        <Field id="booking-phone" label="Телефон" required error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="booking-phone"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("booking-phone", Boolean(errors.phone), false)}
              />
            )}
          />
        </Field>
      </div>

      <Field
        id="booking-car"
        label="Марка и модель авто"
        hint="Например, Kia Sportage 2021"
        error={errors.car?.message}
      >
        <Input
          id="booking-car"
          placeholder="Kia Sportage"
          invalid={Boolean(errors.car)}
          aria-describedby={describedBy("booking-car", Boolean(errors.car), true)}
          {...register("car")}
        />
      </Field>

      <Controller
        control={control}
        name="branchId"
        render={({ field }) => (
          <ChoiceGroup
            name="branchId"
            label="Филиал"
            options={branches.map((b) => ({
              value: b.id,
              label: b.shortName,
              hint: `${b.address.replace("Санкт-Петербург, ", "")} · ${b.hoursLabel}`,
            }))}
            value={field.value}
            onChange={field.onChange}
            columns={2}
          />
        )}
      />

      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <Field id="booking-date" label="Дата" required error={errors.date?.message}>
          <Input
            id="booking-date"
            type="date"
            min={range.min}
            max={range.max}
            invalid={Boolean(errors.date)}
            aria-describedby={describedBy("booking-date", Boolean(errors.date), false)}
            {...register("date")}
          />
        </Field>

        <Controller
          control={control}
          name="time"
          render={({ field }) => (
            <SlotPicker
              branchId={branchId}
              date={errors.date ? "" : date}
              value={field.value}
              onChange={field.onChange}
              error={errors.time?.message}
              refreshKey={slotsRefresh}
            />
          )}
        />
      </div>

      <Field id="booking-comment" label="Комментарий" error={errors.comment?.message}>
        <Textarea
          id="booking-comment"
          placeholder="Например: шины в багажнике, нужна балансировка всех четырёх"
          invalid={Boolean(errors.comment)}
          aria-describedby={describedBy("booking-comment", Boolean(errors.comment), false)}
          {...register("comment")}
        />
      </Field>

      {/* Honeypot: скрыто от людей, боты заполняют автоматически */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="booking-website">Сайт</label>
        <input
          id="booking-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <Checkbox
        id="booking-consent"
        invalid={Boolean(errors.consent)}
        label={
          <span className="font-normal">
            Согласен на обработку персональных данных согласно{" "}
            <Link
              href="/privacy"
              className="font-semibold text-accent-text underline-offset-2 hover:underline"
            >
              политике конфиденциальности
            </Link>
          </span>
        }
        aria-describedby={errors.consent ? "booking-consent-error" : undefined}
        {...register("consent")}
      />
      {errors.consent && (
        <p id="booking-consent-error" className="-mt-3 text-sm text-danger" role="alert">
          {errors.consent.message}
        </p>
      )}

      {submit.status === "error" && (
        <div
          className="flex items-start gap-3 rounded-2xl bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p>{submit.message}</p>
            <button
              type="submit"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" /> Повторить отправку
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="booking-form-note" className="text-xs text-muted">
          Без предоплаты. Подтверждаем заявку звонком или сообщением.
        </p>
        <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
          {busy ? "Отправляем…" : "Записаться"}
        </Button>
      </div>
    </form>
  );
}
