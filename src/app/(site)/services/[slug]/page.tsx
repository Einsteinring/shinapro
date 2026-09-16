import { ArrowLeft, Check, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, services } from "@/config/services";
import { siteConfig } from "@/config/site";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ServiceIcon } from "@/components/ui/service-icon";
import { formatPrice } from "@/lib/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Услуга не найдена" };
  const title = `${service.title} в Санкт-Петербурге от ${formatPrice(service.priceFrom)}`;
  return {
    title,
    description: service.short,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${title} — ${siteConfig.name}`,
      description: service.short,
      url: `/services/${service.slug}`,
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const calculatorHref = service.calculatorPreset
    ? `/?${service.calculatorPreset}#calculator`
    : "/#calculator";
  const others = services.filter((s) => s.slug !== service.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.short,
    provider: { "@id": `${siteConfig.url}/#organization` },
    areaServed: { "@type": "City", name: "Санкт-Петербург" },
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: service.priceFrom,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: service.priceFrom,
        priceCurrency: "RUB",
        unitText: service.unit,
      },
    },
  };

  return (
    <article className="py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Container>
        <nav aria-label="Хлебные крошки" className="mb-8 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-fg">
                Главная
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/#services" className="hover:text-fg">
                Услуги
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-fg">
              {service.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div>
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
              <ServiceIcon name={service.icon} className="size-7" />
            </span>
            <h1 className="mt-6 text-3xl font-bold sm:text-4xl lg:text-5xl">{service.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{service.short}</p>

            <div className="mt-8 space-y-4 leading-relaxed">
              {service.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <h2 className="mt-10 text-xl font-bold">Что входит</h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {service.includes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {service.faq && service.faq.length > 0 && (
              <>
                <h2 className="mt-10 text-xl font-bold">Вопросы по услуге</h2>
                <Accordion
                  items={service.faq.map((f, i) => ({ id: `faq-${i}`, title: f.q, content: f.a }))}
                  className="mt-4 border-t border-border"
                />
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="text-xs font-semibold tracking-wide text-accent-text uppercase">
                Стоимость
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-sm text-muted">от</span>
                <span className="font-heading text-4xl font-extrabold">
                  {formatPrice(service.priceFrom)}
                </span>
              </p>
              <p className="text-sm text-muted">{service.unit}, легковой автомобиль R13–R15</p>
              <p className="mt-4 flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted" aria-hidden="true" />
                {service.duration}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <ButtonLink href={calculatorHref} size="lg" className="w-full">
                  Рассчитать под мою машину
                </ButtonLink>
                <ButtonLink href="/#booking" size="lg" variant="outline" className="w-full">
                  Записаться
                </ButtonLink>
              </div>
              <p className="mt-4 text-xs text-muted">
                Цена ориентировочная, итог после осмотра автомобиля.
              </p>
            </div>

            <div className="mt-6">
              <h2 className="font-sans text-sm font-semibold">Другие услуги</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {others.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:border-accent/60"
                    >
                      <span className="font-semibold">{s.title}</span>
                      <span className="whitespace-nowrap text-muted">
                        от {formatPrice(s.priceFrom)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/#services"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Все услуги
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}
