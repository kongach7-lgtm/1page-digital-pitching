import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const passcode = String(body?.passcode ?? "");

  if (passcode && passcode === process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
}
