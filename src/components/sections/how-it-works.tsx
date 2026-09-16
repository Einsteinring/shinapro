import { CalendarCheck, Calculator, CarFront, Smile } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const steps = [
  {
    icon: Calculator,
    title: "Считаете стоимость",
    text: "Выбираете авто, радиус и услуги в калькуляторе. Сумма пересчитывается сразу, ссылкой можно поделиться.",
  },
  {
    icon: CalendarCheck,
    title: "Выбираете время",
    text: "Свободные слоты с шагом 30 минут на 30 дней вперёд. Подтверждаем заявку в Telegram или по телефону.",
  },
  {
    icon: CarFront,
    title: "Приезжаете к назначенному часу",
    text: "Без очереди: пост уже свободен. Пока работаем, можно выпить кофе в зоне ожидания или посмотреть через стекло.",
  },
  {
    icon: Smile,
    title: "Уезжаете с гарантией",
    text: "Проверяем давление, затягиваем динамометром, выдаём чек. 12 месяцев гарантии на балансировку и ремонт.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 border-y border-border bg-surface py-16 sm:py-24"
      aria-labelledby="how-title"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Как мы работаем"
            title={<span id="how-title">Четыре шага от расчёта до готовых колёс</span>}
            align="center"
          />
        </Reveal>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 90} className="relative">
              <div className="h-full rounded-3xl border border-border bg-bg p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-fg">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-3xl font-bold text-muted" aria-hidden="true">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold">
                  <span className="sr-only">Шаг {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
