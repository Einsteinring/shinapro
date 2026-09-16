import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { services } from "@/config/services";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceIcon } from "@/components/ui/service-icon";
import { formatPrice } from "@/lib/format";

/**
 * Единственная секция с карточками: у услуг это оправдано, каждая карточка ведёт
 * на свою страницу. Остальные секции страницы намеренно устроены иначе.
 * Здесь же единственная на странице оркестрованная анимация появления.
 */
export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-16 sm:py-24" aria-labelledby="services-title">
      <Container>
        <SectionHeading
          title={<span id="services-title">Всё для колёс и немного больше</span>}
          description="Цены «от» для легкового автомобиля на R13–R15. Точную сумму под ваш радиус и тип дисков покажет калькулятор."
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={Math.min(i, 5) * 60}>
              {/* На телефоне карточка горизонтальная: семь вертикальных плиток подряд
                  превращали секцию в длинный монотонный скролл */}
              <Link
                href={`/services/${service.slug}`}
                className="group relative flex h-full gap-4 rounded-3xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-card sm:flex-col sm:gap-0 sm:p-6"
              >
                <ArrowUpRight
                  className="absolute top-5 right-5 size-5 text-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg sm:top-6 sm:right-6"
                  aria-hidden="true"
                />
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-text transition-colors group-hover:bg-accent group-hover:text-accent-fg sm:size-12">
                  <ServiceIcon name={service.icon} className="size-6" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col sm:mt-5">
                  <h3 className="pr-7 text-lg font-bold">{service.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted sm:mt-2">
                    {service.short}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1.5 sm:mt-5">
                    <span className="text-xs text-muted">от</span>
                    <span className="font-heading text-xl font-bold">
                      {formatPrice(service.priceFrom)}
                    </span>
                    <span className="text-xs text-muted">{service.unit}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}

          {/* Растянут на две колонки, чтобы сетка закрывалась без пустой ячейки */}
          <Reveal as="li" delay={360} className="lg:col-span-2">
            <Link
              href="/#calculator"
              className="flex h-full min-h-56 flex-col justify-center rounded-3xl bg-emphasis p-6 text-emphasis-fg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div className="max-w-md">
                <h3 className="text-2xl leading-tight font-bold">
                  Посчитайте точную стоимость под свою машину
                </h3>
                <p className="mt-2 text-sm opacity-70">
                  Радиус, тип дисков, количество колёс и допуслуги. Тридцать секунд, без звонка.
                </p>
              </div>
              <span className="mt-4 inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg sm:mt-0">
                Открыть калькулятор
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        </ul>
      </Container>
    </section>
  );
}
