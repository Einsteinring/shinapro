import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Open Graph-картинка генерируется на сервере: без бинарных ассетов в репозитории */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #0e1013 0%, #1d2129 100%)",
        color: "#f1f2f4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Тот же знак, что в шапке сайта: покрышка с протектором */}
        <div
          style={{
            position: "relative",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 56,
              height: 56,
              borderRadius: 999,
              border: "14px solid #f1f2f4",
            }}
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 56,
                height: 56,
                display: "flex",
                justifyContent: "center",
                transform: `rotate(${deg}deg)`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 11,
                  marginTop: 2,
                  borderRadius: 3,
                  transform: "rotate(14deg)",
                  background: "#ff6a00",
                }}
              />
            </div>
          ))}
          <div style={{ width: 23, height: 23, borderRadius: 999, background: "#f1f2f4" }} />
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
          <span>Шина</span>
          <span style={{ color: "#ff6a00" }}>Про</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
          Переобуем за 40 минут. Точно по записи.
        </div>
        <div style={{ fontSize: 32, color: "#9ba2ae" }}>{siteConfig.tagline}</div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 26 }}>
        {["Калькулятор стоимости", "Онлайн-запись", "2 филиала"].map((t) => (
          <div
            key={t}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "2px solid rgba(255,106,0,0.5)",
              background: "rgba(255,106,0,0.12)",
              color: "#ff8a3d",
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
