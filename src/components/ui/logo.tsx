import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="currentColor" className="text-fg" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--color-bg)" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="3" fill="var(--color-accent)" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x="15"
          y="2"
          width="2"
          height="4"
          rx="1"
          fill="var(--color-accent)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
      aria-label={`${siteConfig.name}, на главную`}
    >
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight">
        Шина<span className="text-accent-text">Про</span>
      </span>
    </Link>
  );
}
