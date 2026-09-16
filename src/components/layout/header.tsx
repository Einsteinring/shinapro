"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { navigation, siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Закрываем меню по Esc и блокируем скролл под ним
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open
          ? "border-b border-border bg-bg/85 shadow-[0_1px_0_0_var(--color-border)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Перейти к содержимому
      </a>
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Logo />

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={siteConfig.phoneHref}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-2 md:flex"
          >
            <Phone className="size-4" aria-hidden="true" />
            {siteConfig.phone}
          </a>
          <ThemeToggle />
          <ButtonLink href="/#booking" size="sm" className="hidden sm:inline-flex">
            Записаться
          </ButtonLink>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-surface-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {/* Мобильное меню */}
      <div
        id="mobile-menu"
        className={cn(
          // absolute, а не fixed: backdrop-blur у шапки делает её containing block, и fixed-панель схлопывалась
          "absolute inset-x-0 top-full z-30 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-bg transition-[opacity,transform] duration-300 lg:hidden",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        inert={!open}
      >
        <Container className="flex flex-col gap-6 py-6">
          <nav aria-label="Мобильная навигация">
            <ul className="flex flex-col">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-border py-4 text-lg font-semibold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-3">
            <ButtonLink href="/#booking" size="lg" className="w-full">
              Записаться онлайн
            </ButtonLink>
            <a
              href={siteConfig.phoneHref}
              className="flex h-13 items-center justify-center gap-2 rounded-full border border-border font-semibold"
            >
              <Phone className="size-4" aria-hidden="true" />
              {siteConfig.phone}
            </a>
          </div>
        </Container>
      </div>
    </header>
  );
}
