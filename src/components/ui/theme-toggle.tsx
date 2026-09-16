"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Тема известна только на клиенте: на сервере рендерим нейтральную кнопку без иконки
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Включить светлую тему" : "Включить тёмную тему";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-surface-2",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[18px]" aria-hidden="true" />
        ) : (
          <Moon className="size-[18px]" aria-hidden="true" />
        )
      ) : (
        <span className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
