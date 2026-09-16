/**
 * Декоративное колесо для hero: шина с протектором, литой диск со спицами, ступица.
 * Инлайновый SVG без картинок. Палитра фиксированная (резина всегда тёмная, диск светлый),
 * чтобы иллюстрация одинаково читалась в светлой и тёмной теме; акцент берётся из темы.
 */
const TREAD_BLOCKS = 40;
const SPOKES = 10;
const BOLTS = 5;

const RUBBER = "#1a1d23";
const RUBBER_LIGHT = "#2b2f37";
const RIM = "#e6e8ec";
const RIM_SHADE = "#c9ccd3";
const WINDOW = "#23262e";

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: 200 + r * Math.cos(a), y: 200 + r * Math.sin(a) };
};

export function WheelIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      {/* Шина */}
      <circle cx="200" cy="200" r="196" fill={RUBBER} />
      {/* Протектор: блоки по окружности */}
      {Array.from({ length: TREAD_BLOCKS }, (_, i) => (
        <rect
          key={i}
          x="192"
          y="6"
          width="16"
          height="26"
          rx="3"
          fill={RUBBER_LIGHT}
          transform={`rotate(${(360 / TREAD_BLOCKS) * i} 200 200)`}
        />
      ))}
      {/* Боковина: тонкие кольца */}
      <circle cx="200" cy="200" r="162" fill="none" stroke="#3a3e47" strokeWidth="2" />
      <circle cx="200" cy="200" r="152" fill="none" stroke="#3a3e47" strokeWidth="1" />

      {/* Обод диска */}
      <circle cx="200" cy="200" r="142" fill={RIM_SHADE} />
      <circle cx="200" cy="200" r="134" fill={RIM} />
      {/* Тёмные окна между спицами */}
      <circle cx="200" cy="200" r="124" fill={WINDOW} />
      {/* Спицы */}
      {Array.from({ length: SPOKES }, (_, i) => (
        <path
          key={i}
          d="M187 200 L175 80 Q200 72 225 80 L213 200 Z"
          fill={RIM}
          stroke={RIM_SHADE}
          strokeWidth="2"
          strokeLinejoin="round"
          transform={`rotate(${(360 / SPOKES) * i} 200 200)`}
        />
      ))}

      {/* Ступица */}
      <circle cx="200" cy="200" r="54" fill={RIM} stroke={RIM_SHADE} strokeWidth="6" />
      {Array.from({ length: BOLTS }, (_, i) => {
        const p = polar(35, -90 + (360 / BOLTS) * i);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6.5" fill={WINDOW} />
            <circle cx={p.x} cy={p.y} r="2.5" fill={RIM_SHADE} />
          </g>
        );
      })}
      {/* Центр с акцентом */}
      <circle cx="200" cy="200" r="17" fill={WINDOW} />
      <circle cx="200" cy="200" r="7" fill="var(--color-accent)" />
    </svg>
  );
}
