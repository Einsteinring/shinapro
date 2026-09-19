import type { NextConfig } from "next";

/**
 * Telegram Mini App лежит статикой в public/app и открывается по /app.
 * Ему нужны два послабления относительно остального сайта:
 *   1. /app без слеша должен отдавать index.html — статика сама этого не делает;
 *   2. X-Frame-Options: SAMEORIGIN на нём стоять не может: Telegram Web открывает
 *      приложение в iframe с web.telegram.org, и запрет просто покажет пустой экран.
 *      Вместо него — frame-ancestors, где явно перечислены домены мессенджера.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/app", destination: "/app/index.html" }];
  },
  async headers() {
    return [
      {
        // Всё, кроме /app и того, что под ним
        source: "/:path((?!app$|app/).*)",
        headers: [...SECURITY_HEADERS, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/app/:path*",
        headers: [
          ...SECURITY_HEADERS,
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://*.t.me",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
