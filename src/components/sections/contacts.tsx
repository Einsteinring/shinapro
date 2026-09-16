import { Clock, MapPin, Phone, TrainFront } from "lucide-react";
import { branches, siteConfig } from "@/config/site";
import { MapFacade } from "@/components/sections/map-facade";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export function Contacts() {
  return (
    <section
      id="contacts"
      className="scroll-mt-20 border-y border-border bg-surface py-16 sm:py-24"
      aria-labelledby="contacts-title"
    >
      <Container>
        <SectionHeading
          title={<span id="contacts-title">Две точки: юг и север города</span>}
          description="На Типанова работаем ежедневно с 09:00 до 21:00. Оба филиала с зоной ожидания, кофе и Wi-Fi, парковка перед боксами бесплатная."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            {branches.map((branch) => (
              <article
                key={branch.id}
                className="rounded-3xl border border-border bg-bg p-6"
                aria-labelledby={`branch-${branch.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 id={`branch-${branch.id}`} className="text-lg font-bold">
                    {branch.name}
                  </h3>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
                    {branch.shortName}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex gap-3">
                    <dt className="sr-only">Адрес</dt>
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    <dd>{branch.address}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="sr-only">Метро</dt>
                    <TrainFront className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    <dd className="text-muted">{branch.metro}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="sr-only">Часы работы</dt>
                    <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    <dd>{branch.hoursLabel}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="sr-only">Телефон</dt>
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    <dd>
                      <a href={branch.phoneHref} className="font-semibold hover:text-accent-text">
                        {branch.phone}
                      </a>
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink href="/#booking" size="sm">
                    Записаться сюда
                  </ButtonLink>
                  <ButtonLink
                    href={`https://yandex.ru/maps/?rtext=~${branch.coords.lat},${branch.coords.lng}`}
                    size="sm"
                    variant="outline"
                    external
                  >
                    Построить маршрут
                  </ButtonLink>
                </div>
              </article>
            ))}
            <p className="text-sm text-muted">
              Общий телефон{" "}
              <a href={siteConfig.phoneHref} className="font-semibold text-fg">
                {siteConfig.phone}
              </a>{" "}
              и почта{" "}
              <a href={`mailto:${siteConfig.email}`} className="font-semibold text-fg">
                {siteConfig.email}
              </a>
              .
            </p>
          </div>

          <div className="min-h-[320px]">
            <MapFacade />
          </div>
        </div>
      </Container>
    </section>
  );
}
