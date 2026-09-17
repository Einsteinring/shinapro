import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const WHEEL = 124;
const GROOVES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Иконка для экрана «Домой» на iOS. Та же покрышка, что в src/app/icon.svg,
 * но собрана из блоков: ImageResponse рисует через satori.
 * Размеры у слоёв заданы явно, сокращение inset satori не понимает.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#15171c",
      }}
    >
      <div
        style={{
          position: "relative",
          width: WHEEL,
          height: WHEEL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* покрышка */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WHEEL,
            height: WHEEL,
            borderRadius: 999,
            border: "31px solid #f1f2f4",
          }}
        />
        {/* грунтозацепы: обёртка вращается вокруг центра колеса */}
        {GROOVES.map((deg) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WHEEL,
              height: WHEEL,
              display: "flex",
              justifyContent: "center",
              transform: `rotate(${deg}deg)`,
            }}
          >
            <div
              style={{
                width: 12,
                height: 25,
                marginTop: 4,
                borderRadius: 6,
                transform: "rotate(14deg)",
                background: "#ff6a00",
              }}
            />
          </div>
        ))}
        {/* диск */}
        <div style={{ width: 52, height: 52, borderRadius: 999, background: "#f1f2f4" }} />
      </div>
    </div>,
    size,
  );
}
