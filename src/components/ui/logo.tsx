import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Знак бренда: покрышка с протектором. Кольцо и диск берут цвет текста,
 * поэтому знак живёт на любом фоне, а грунтозацепы — акцентные.
 * Та же геометрия продублирована в src/app/icon.svg и apple-icon.tsx.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 text-fg", className)} aria-hidden="true">
      {/* покрышка */}
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="5.5" />
      {/* грунтозацепы под углом, как у направленной резины */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect
          key={deg}
          x="14.9"
          y="1.6"
          width="2.2"
          height="4.8"
          rx="1.1"
          fill="var(--color-accent)"
          transform={`rotate(${deg} 16 16) rotate(14 16 4)`}
        />
      ))}
      {/* диск */}
      <circle cx="16" cy="16" r="5" fill="currentColor" />
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
