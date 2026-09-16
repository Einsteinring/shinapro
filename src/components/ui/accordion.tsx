"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: readonly AccordionItem[];
  /** Открыть первый элемент по умолчанию */
  defaultOpenId?: string;
  className?: string;
}

/**
 * Аккордеон на кнопках с aria-expanded/aria-controls. Анимация высоты через grid-rows
 * (см. .accordion-panel в globals.css), поэтому не нужно измерять контент.
 */
export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const baseId = useId();

  return (
    <div className={cn("divide-y divide-border", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="group flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-accent-text"
              >
                <span className="text-base font-semibold sm:text-lg">{item.title}</span>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-all duration-300",
                    open
                      ? "rotate-180 border-accent bg-accent text-accent-fg"
                      : "group-hover:border-fg/40",
                  )}
                  aria-hidden="true"
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="accordion-panel"
              data-open={open}
            >
              <div>
                <p className="pr-4 pb-5 leading-relaxed text-muted sm:pr-14">{item.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
