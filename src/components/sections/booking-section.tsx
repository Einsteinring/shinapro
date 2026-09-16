import { CalendarClock, MessageCircle, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LazyBookingForm } from "@/components/booking/lazy-booking-form";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const notes = [
  { icon: CalendarClock, text: "Запись на 30 дней вперёд, слоты по 30 минут" },
  { icon: MessageCircle, text: "Подтверждение в Telegram или по телефону за 15 минут" },
  { icon: ShieldCheck, text: "Данные не передаём третьим лицам, без спама" },
];

export function BookingSection() {
  return (
    <section id="booking" className="scroll-mt-20 py-16 sm:py-24" aria-labelledby="booking-title">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div>
          <SectionHeading
            title={<span id="booking-title">Выберите время, остальное сделаем мы</span>}
            description="Заполните форму за минуту. Если пришли из калькулятора, расчёт прикрепится к заявке автоматически."
          />
          <ul className="mt-8 flex flex-col gap-4">
            {notes.map((note) => (
              <li key={note.text} className="flex items-center gap-3 text-sm">
                <note.icon className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                {note.text}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            Удобнее голосом? Звоните{" "}
            <a href={siteConfig.phoneHref} className="font-semibold text-fg">
              {siteConfig.phone}
            </a>
            .
          </p>
        </div>
        <LazyBookingForm />
      </Container>
    </section>
  );
}
