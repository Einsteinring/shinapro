import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

/** POST /api/admin/logout → удаляет cookie сессии */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
