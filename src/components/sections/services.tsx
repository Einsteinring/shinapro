import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { services } from "@/config/services";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceIcon } from "@/components/ui/service-icon";
import { formatPrice } from "@/lib/format";

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-16 sm:py-24" aria-labelledby="services-title">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Услуги"
            title={<span id="services-title">Всё для колёс и немного больше</span>}
            description="Цены «от» для легкового автомобиля на R13–R15. Точную сумму под ваш радиус и тип дисков покажет калькулятор."
          />
        </Reveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={Math.min(i, 5) * 60}>
              <Link
                href={`/services/${service.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text transition-colors group-hover:bg-accent group-hover:text-accent-fg">
                    <ServiceIcon name={service.icon} className="size-6" />
                  </span>
                  <ArrowUpRight
                    className="size-5 text-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 text-lg font-bold">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{service.short}</p>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-xs text-muted">от</span>
                  <span className="font-heading text-xl font-bold">
                    {formatPrice(service.priceFrom)}
                  </span>
                  <span className="text-xs text-muted">{service.unit}</span>
                </div>
              </Link>
            </Reveal>
          ))}
          <Reveal as="li" delay={360}>
            <Link
              href="/#calculator"
              className="flex h-full min-h-56 flex-col justify-between rounded-3xl bg-fg p-6 text-bg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
            >
              <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                Калькулятор
              </p>
              <div>
                <h3 className="text-2xl leading-tight font-bold">
                  Посчитайте точную стоимость под свою машину
                </h3>
                <p className="mt-2 text-sm opacity-70">
                  Радиус, тип дисков, количество колёс и допуслуги. 30 секунд.
                </p>
              </div>
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">
                Открыть калькулятор <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        </ul>
      </Container>
    </section>
  );
}
