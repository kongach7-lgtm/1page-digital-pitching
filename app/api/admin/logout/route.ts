import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
