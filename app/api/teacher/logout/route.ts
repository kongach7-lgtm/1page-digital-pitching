import { NextResponse } from "next/server";
import { clearTeacherCookie } from "@/lib/auth-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearTeacherCookie(res);
  return res;
}
