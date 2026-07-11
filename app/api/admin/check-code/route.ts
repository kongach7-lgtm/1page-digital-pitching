import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isMasterCode } from "@/lib/auth";

// ใช้ตรวจสอบรหัสอาจารย์แบบสดขณะพิมพ์ (ก่อนกด login) — เป็น public endpoint
// เพราะตัวการ login เองยังไม่เกิดขึ้น แต่ไม่คืนรายชื่อรหัสทั้งหมด คืนแค่ผลของรหัสที่ถามมา
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ role: null });
  }
  if (isMasterCode(code)) {
    return NextResponse.json({ role: "master" });
  }
  if (store.instructorRoster.has(code)) {
    return NextResponse.json({ role: "instructor", name: store.instructorRoster.get(code) });
  }
  return NextResponse.json({ role: null });
}
