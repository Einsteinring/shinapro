import { Calculator, Clock, ShieldCheck, Wrench } from "lucide-react";
import { siteConfig, trustBadges } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { WheelIllustration } from "@/components/sections/wheel-illustration";

const badgeIcons = [ShieldCheck, Wrench, Clock];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-24 lg:pb-32"
      aria-labelledby="hero-title"
    >
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-60 right-[-15%] size-[760px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent)_24%,transparent)_0%,transparent_62%)]"
        aria-hidden="true"
      />

      <Container className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent-text">
            <span
              className="size-1.5 animate-pulse-soft rounded-full bg-accent"
              aria-hidden="true"
            />
            Два филиала в Петербурге
          </p>
          <h1
            id="hero-title"
            className="text-[2.35rem] leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl"
          >
            Переобуем за 40 минут. <span className="text-accent-text">Точно по записи.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Шиномонтаж, балансировка, ремонт проколов и сезонное хранение. Посчитайте стоимость
            онлайн, выберите время и приезжайте без очереди.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/#calculator" size="lg">
              <Calculator className="size-5" aria-hidden="true" />
              Рассчитать стоимость
            </ButtonLink>
            <ButtonLink href="/#booking" size="lg" variant="outline">
              Записаться онлайн
            </ButtonLink>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Почему нам доверяют">
            {trustBadges.map((badge, i) => {
              const Icon = badgeIcons[i] ?? ShieldCheck;
              return (
                <li
                  key={badge.label}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface/70 p-3.5 backdrop-blur-sm"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm leading-tight font-bold">{badge.label}</span>
                    <span className="block text-xs leading-snug text-muted">
                      {badge.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Визуальный блок: «шина» из CSS, без картинок — быстро и в обеих темах */}
        <div
          className="relative mx-auto hidden aspect-square w-full max-w-md lg:block"
          aria-hidden="true"
        >
          <WheelIllustration className="size-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]" />
          <div className="absolute -bottom-2 -left-6 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
            <p className="text-xs text-muted">Средний чек за комплекс</p>
            <p className="font-heading text-xl font-bold">2 740 ₽</p>
          </div>
          <div className="absolute -top-2 -right-4 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
            <p className="text-xs text-muted">Работаем с</p>
            <p className="font-heading text-xl font-bold">{siteConfig.foundedYear} года</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
