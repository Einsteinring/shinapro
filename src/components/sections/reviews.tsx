"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { reviews } from "@/config/reviews";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StarRating } from "@/components/ui/star-rating";
import { formatDateRu } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Слайдер отзывов на CSS scroll-snap: работает без JS (обычный горизонтальный скролл),
 * JS добавляет кнопки и точки. Отзывы намеренно без рамок: текст крупнее, чем в карточках,
 * разделяют их линейки, а не коробки.
 */
export function Reviews() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const average = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const scrollTo = useCallback((i: number) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const first = track.children[0] as HTMLElement | undefined;
        const gap = 16;
        const width = (first?.offsetWidth ?? 1) + gap;
        setIndex(Math.min(reviews.length - 1, Math.max(0, Math.round(track.scrollLeft / width))));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const prev = () => scrollTo(Math.max(0, index - 1));
  const next = () => scrollTo(Math.min(reviews.length - 1, index + 1));

  return (
    <section
      id="reviews"
      className="scroll-mt-20 border-y border-border bg-surface py-16 sm:py-24"
      aria-labelledby="reviews-title"
    >
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            title={<span id="reviews-title">Что говорят клиенты</span>}
            description={
              <>
                Средняя оценка <strong className="text-fg">{average}</strong> по {reviews.length}{" "}
                отзывам с Яндекс Карт, 2ГИС и Google. Тексты сокращены, орфография сохранена.
              </>
            }
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-bg disabled:opacity-40"
              aria-label="Предыдущий отзыв"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={index === reviews.length - 1}
              className="flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-bg disabled:opacity-40"
              aria-label="Следующий отзыв"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          role="region"
          aria-roledescription="карусель"
          aria-label="Отзывы клиентов"
          className="mt-12"
        >
          <ul
            ref={trackRef}
            className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 scrollbar-none gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:scroll-pl-0 sm:px-0"
          >
            {reviews.map((review, i) => (
              <li
                key={review.id}
                aria-label={`Отзыв ${i + 1} из ${reviews.length}`}
                className="flex w-[85%] shrink-0 snap-start flex-col border-t border-border pt-5 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
              >
                <StarRating value={review.rating} />
                <p className="mt-4 flex-1 text-[17px] leading-relaxed">{review.text}</p>
                <footer className="mt-6 flex items-baseline justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold">{review.author}</p>
                    <p className="text-xs text-muted">{review.car}</p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{review.source}</p>
                    <time dateTime={review.date}>
                      {formatDateRu(review.date, { weekday: false, year: true })}
                    </time>
                  </div>
                </footer>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                type="button"
                tabIndex={-1}
                onClick={() => scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-accent" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
