import { CalendarCheck, Calculator, CarFront, Smile } from "lucide-react";
import { Container } from "@/components/ui/container";
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

/**
 * Это реальная последовательность, поэтому она нарисована как линия с засечками,
 * а не как четыре одинаковые карточки: связь между шагами видна глазом.
 */
export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 border-y border-border bg-surface py-16 sm:py-24"
      aria-labelledby="how-title"
    >
      <Container>
        <SectionHeading
          title={<span id="how-title">Четыре шага от расчёта до готовых колёс</span>}
          description="От расчёта до выезда из бокса проходит примерно час, и почти всё это время машина на посту, а не в очереди."
        />

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              {/* Отрезок линии до следующего шага; у последнего его нет */}
              {i < steps.length - 1 && (
                <span
                  className="absolute top-6 left-[5.5rem] hidden h-px w-[calc(100%-3.5rem)] bg-border lg:block"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-3">
                <span className="relative z-10 flex size-12 items-center justify-center rounded-full border border-border bg-surface font-heading text-lg font-bold">
                  {i + 1}
                </span>
                <step.icon className="size-5 text-accent-text" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-bold">
                <span className="sr-only">Шаг {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
