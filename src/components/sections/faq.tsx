import { faq } from "@/config/faq";
import { siteConfig } from "@/config/site";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-24" aria-labelledby="faq-title">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            title={<span id="faq-title">Спрашивают чаще всего</span>}
            description="Не нашли ответ? Напишите в Telegram, отвечаем в рабочее время в течение 10 минут."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={siteConfig.telegram} variant="outline" external>
              Написать в Telegram
            </ButtonLink>
            <ButtonLink href={siteConfig.phoneHref} variant="ghost">
              {siteConfig.phone}
            </ButtonLink>
          </div>
        </div>
        <Accordion
          items={faq.map((item) => ({ id: item.id, title: item.question, content: item.answer }))}
          defaultOpenId={faq[0]?.id}
          className="border-t border-border"
        />
      </Container>
    </section>
  );
}
