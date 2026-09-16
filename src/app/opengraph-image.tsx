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
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "#f1f2f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 999, background: "#ff6a00" }} />
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
