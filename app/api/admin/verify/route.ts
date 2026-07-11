import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isMasterCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const passcode = String(body?.passcode ?? "").trim();

  if (isMasterCode(passcode)) {
    return NextResponse.json({ ok: true, role: "master" });
  }
  if (passcode && store.instructorRoster.has(passcode)) {
    return NextResponse.json({ ok: true, role: "instructor", name: store.instructorRoster.get(passcode) });
  }

  return NextResponse.json({ ok: false, error: "รหัสไม่ถูกต้อง" }, { status: 401 });
}
