import { BadgeCheck, Clock3, HandCoins, Home, Receipt, Snowflake } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const items = [
  {
    icon: Clock3,
    title: "По записи, без ожидания",
    text: "Слот 30 минут закреплён за вами. Приехали в 18:30, в 18:30 машина на посту.",
  },
  {
    icon: Receipt,
    title: "Цена совпадает с калькулятором",
    text: "Прайс один и тот же на сайте и в боксе. Если что-то меняется на осмотре, сначала согласуем.",
  },
  {
    icon: BadgeCheck,
    title: "Гарантия 12 месяцев",
    text: "На балансировку и ремонт проколов. Появилась вибрация, перебалансируем бесплатно.",
  },
  {
    icon: Snowflake,
    title: "Хранение с доставкой",
    text: "Шины ждут сезона на отапливаемом складе, а к переобувке мы привозим их сами.",
  },
  {
    icon: Home,
    title: "Выезд на дом",
    text: "Мобильный шиномонтаж в пределах КАД. Спустило колесо у дома, приедем и починим на месте.",
  },
  {
    icon: HandCoins,
    title: "Оплата как удобно",
    text: "Наличные, карта, СБП. Для ИП и компаний безнал и закрывающие документы.",
  },
];

/** Ruled-список на тонких линейках вместо сетки карточек: та же информация, меньше рамок. */
export function Advantages() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="advantages-title">
      <Container>
        <SectionHeading
          title={<span id="advantages-title">Почему к нам возвращаются</span>}
          description="Не обещаем «лучший сервис в городе». Обещаем, что запись сработает, цена не удивит, а колёса не будут вибрировать."
        />
        <ul className="mt-10 grid sm:grid-cols-2 sm:gap-x-12 lg:gap-x-20">
          {items.map((item) => (
            <li key={item.title} className="flex gap-4 border-t border-border py-6">
              <item.icon className="mt-1 size-5 shrink-0 text-accent-text" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
