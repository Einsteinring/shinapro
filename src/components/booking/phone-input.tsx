"use client";

import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/field";
import { formatPhoneInput, PHONE_MASK_PLACEHOLDER } from "@/lib/phone";

interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

/** Поле телефона с маской +7 (___) ___-__-__. Значение всегда отформатировано. */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, ...props },
  ref,
) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneInput(e.target.value));
  };

  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={PHONE_MASK_PLACEHOLDER}
      value={value}
      onChange={handleChange}
      maxLength={18}
      {...props}
    />
  );
});
