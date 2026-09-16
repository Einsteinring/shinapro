import { LazyCalculator } from "@/components/calculator/lazy-calculator";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export function CalculatorSection() {
  return (
    <section
      id="calculator"
      className="scroll-mt-20 py-16 sm:py-24"
      aria-labelledby="calculator-title"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Калькулятор"
            title={<span id="calculator-title">Сколько будет стоить</span>}
            description="Сумма пересчитывается сразу. Параметры сохраняются в адресной строке: скопируйте ссылку и отправьте расчёт кому угодно."
          />
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <LazyCalculator />
        </Reveal>
      </Container>
    </section>
  );
}
