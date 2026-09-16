"use client";

import { useState } from "react";
import { branches } from "@/config/site";
import { Button } from "@/components/ui/button";

/**
 * «Фасад» карты: тяжёлый iframe Яндекс.Карт грузится только по клику, это экономит
 * около мегабайта на первой загрузке. До клика на месте карты не пустой прямоугольник,
 * а схема города с двумя точками, чтобы блок нёс информацию сразу.
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
        <>
          <SchematicMap />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-5 text-center">
            <p className="text-xs text-muted">Схема, не масштаб</p>
            <Button variant="outline" className="bg-surface" onClick={() => setLoaded(true)}>
              Показать карту
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Условная схема Петербурга: залив, Нева, КАД и две точки филиалов. */
function SchematicMap() {
  const label = {
    fill: "var(--color-fg)",
    stroke: "var(--color-surface-2)",
    strokeWidth: 4,
    paintOrder: "stroke" as const,
    fontSize: 13,
    fontWeight: 700,
  };

  return (
    <svg
      viewBox="0 0 400 320"
      className="absolute inset-0 size-full"
      role="img"
      aria-label="Схема Петербурга с двумя филиалами: Богатырский проспект на севере и улица Типанова на юге"
    >
      {/* Финский залив */}
      <path d="M0 96 Q58 128 46 176 Q38 216 0 244 Z" fill="var(--color-border)" opacity="0.55" />
      {/* Нева */}
      <path
        d="M44 168 Q118 150 176 168 Q236 186 300 152 Q348 126 400 132"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* КАД */}
      <ellipse
        cx="206"
        cy="164"
        rx="142"
        ry="126"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="7 9"
      />
      {/* Вылетные магистрали */}
      {[
        "M206 164 L150 74",
        "M206 164 L300 96",
        "M206 164 L222 288",
        "M206 164 L82 206",
        "M206 164 L332 214",
      ].map((d) => (
        <path key={d} d={d} stroke="var(--color-border)" strokeWidth="1.5" opacity="0.8" />
      ))}

      {/* Филиалы */}
      {[
        { x: 148, y: 78, name: "Богатырский", anchor: "start" as const, dx: 14 },
        { x: 220, y: 262, name: "Типанова", anchor: "start" as const, dx: 14 },
      ].map((p) => (
        <g key={p.name}>
          <circle cx={p.x} cy={p.y} r="13" fill="var(--color-accent)" opacity="0.18" />
          <circle
            cx={p.x}
            cy={p.y}
            r="6.5"
            fill="var(--color-accent)"
            stroke="var(--color-surface-2)"
            strokeWidth="2.5"
          />
          <text x={p.x + p.dx} y={p.y + 5} textAnchor={p.anchor} {...label}>
            {p.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
