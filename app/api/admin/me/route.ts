import { NextRequest, NextResponse } from "next/server";
import { getAdmin, unauthorized } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");
  return NextResponse.json({ ok: true });
}
