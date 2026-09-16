"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { branches } from "@/config/site";
import { Button } from "@/components/ui/button";

/**
 * «Фасад» карты: тяжёлый iframe Яндекс.Карт грузится только по клику.
 * Это экономит ~1 МБ на первой загрузке и держит Lighthouse Performance ≥ 90.
 */
export function MapFacade() {
  const [loaded, setLoaded] = useState(false);

  const center = {
    lat: branches.reduce((s, b) => s + b.coords.lat, 0) / branches.length,
    lng: branches.reduce((s, b) => s + b.coords.lng, 0) / branches.length,
  };
  const points = branches.map((b) => `${b.coords.lng},${b.coords.lat},pm2orm`).join("~");
  const src = `https://yandex.ru/map-widget/v1/?ll=${center.lng},${center.lat}&z=10.5&pt=${points}&lang=ru_RU`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-surface-2 sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[420px]">
      {loaded ? (
        <iframe
          src={src}
          title="Филиалы ШинаПро на карте"
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="bg-grid absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-glow">
            <MapPin className="size-7" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Две точки в Петербурге</p>
            <p className="mt-1 text-sm text-muted">
              Карта загрузится по клику, чтобы не тормозить страницу
            </p>
          </div>
          <Button variant="secondary" onClick={() => setLoaded(true)}>
            Показать карту
          </Button>
        </div>
      )}
    </div>
  );
}
