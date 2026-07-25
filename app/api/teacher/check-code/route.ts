import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ตรวจสอบรหัสอาจารย์แบบสดขณะพิมพ์ (ก่อนกด login) — public endpoint คืนแค่ชื่อของรหัสที่ถามมา
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!code) return NextResponse.json({ valid: false });

  const teacher = db.prepare("SELECT name FROM teachers WHERE code = ?").get(code) as
    | { name: string }
    | undefined;
  if (!teacher) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, name: teacher.name });
}
