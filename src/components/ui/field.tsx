import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/** Общая обёртка поля: label, подсказка, ошибка, связь через aria-describedby */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && (
          <span className="ml-1 text-accent-text" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses = (invalid?: boolean, className?: string) =>
  cn(
    "h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] text-fg transition-colors placeholder:text-muted/70",
    "hover:border-fg/30 focus:border-accent focus:outline-none focus-visible:outline-none",
    invalid ? "border-danger" : "border-border",
    className,
  );

/** Пробрасывает aria-атрибуты ошибки/подсказки по id поля */
export function describedBy(id: string, hasError: boolean, hasHint: boolean) {
  if (hasError) return `${id}-error`;
  if (hasHint) return `${id}-hint`;
  return undefined;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={inputClasses(invalid, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={inputClasses(invalid, cn("h-auto min-h-24 resize-y py-2.5", className))}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={inputClasses(invalid, cn("appearance-none pr-10", className))}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, invalid, id, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
        "hover:border-fg/30 has-checked:border-accent has-checked:bg-accent-soft",
        invalid ? "border-danger" : "border-border",
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="peer mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-accent"
        aria-invalid={invalid || undefined}
        {...props}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] leading-tight font-semibold">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
});
