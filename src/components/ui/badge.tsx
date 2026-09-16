import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
  muted: "bg-surface-2 text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
