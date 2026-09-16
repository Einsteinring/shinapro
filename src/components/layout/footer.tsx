import { Mail, Phone, Send } from "lucide-react";
import Link from "next/link";
import { services } from "@/config/services";
import { branches, navigation, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface pb-24 md:pb-0">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {siteConfig.tagline}. {siteConfig.legalName}
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm">
            <a
              href={siteConfig.phoneHref}
              className="flex items-center gap-2 font-semibold hover:text-accent-text"
            >
              <Phone className="size-4" aria-hidden="true" /> {siteConfig.phone}
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="flex items-center gap-2 hover:text-accent-text"
            >
              <Mail className="size-4" aria-hidden="true" /> {siteConfig.email}
            </a>
            <a
              href={siteConfig.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-accent-text"
            >
              <Send className="size-4" aria-hidden="true" /> Telegram
            </a>
          </div>
        </div>

        <nav aria-label="Услуги">
          <h2 className="mb-4 text-sm font-semibold">Услуги</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="text-muted transition-colors hover:text-fg"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Разделы сайта">
          <h2 className="mb-4 text-sm font-semibold">Разделы</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted transition-colors hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/privacy" className="text-muted transition-colors hover:text-fg">
                Политика конфиденциальности
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-sm font-semibold">Филиалы</h2>
          <ul className="flex flex-col gap-4 text-sm">
            {branches.map((b) => (
              <li key={b.id}>
                <p className="font-semibold">{b.shortName}</p>
                <p className="text-muted">{b.address}</p>
                <p className="text-muted">{b.hoursLabel}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {siteConfig.foundedYear}–{year} {siteConfig.legalName}. Цены на сайте не являются
            публичной офертой.
          </p>
          <p>Вымышленный проект для портфолио. Все совпадения случайны.</p>
        </Container>
      </div>
    </footer>
  );
}
