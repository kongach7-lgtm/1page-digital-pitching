import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const passcode = String(body?.passcode ?? "").trim();

  if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setAdminCookie(res);
  return res;
}
