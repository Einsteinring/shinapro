import { NextResponse } from "next/server";
import { miniappPricingPayload } from "@/lib/miniapp";

/**
 * GET /api/miniapp/pricing — прайс, каталог услуг и филиалы для Mini App.
 *
 * Подпись здесь не требуется: это те же цены, что открыто напечатаны в калькуляторе
 * на главной. Зато благодаря этому демо-режим приложения работает в обычном браузере,
 * и цифры в нём настоящие, а не выдуманные ради картинки.
 */
export async function GET() {
  return NextResponse.json(miniappPricingPayload(), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
