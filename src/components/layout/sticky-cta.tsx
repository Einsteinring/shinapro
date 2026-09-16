"use client";

import { CalendarCheck, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Липкая панель «Записаться» на мобильных. Прячется, когда форма записи
 * уже на экране, чтобы не перекрывать её.
 */
export function StickyCta() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("booking");
    if (!target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(Boolean(entry?.isIntersecting)),
      {
        threshold: 0.15,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 p-3 backdrop-blur-md transition-transform duration-300 md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        hidden && "translate-y-full",
      )}
      inert={hidden}
    >
      <div className="flex gap-2">
        <a
          href={siteConfig.phoneHref}
          className={buttonClasses("outline", "lg", "flex-none px-5")}
          aria-label={`Позвонить ${siteConfig.phone}`}
        >
          <Phone className="size-5" aria-hidden="true" />
        </a>
        <a href="#booking" className={buttonClasses("primary", "lg", "flex-1")}>
          <CalendarCheck className="size-5" aria-hidden="true" />
          Записаться
        </a>
      </div>
    </div>
  );
}
