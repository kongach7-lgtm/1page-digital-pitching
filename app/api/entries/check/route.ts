import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() ?? "";
  const exists = studentId.length > 0 && store.entriesByStudentId.has(studentId);
  // ถ้าอาจารย์ยังไม่ได้อัปโหลดรายชื่อ (roster ว่าง) ให้ผ่านได้ทุกรหัสเหมือนเดิม
  const rosterValid = store.roster.size === 0 || store.roster.has(studentId);
  return NextResponse.json({ exists, rosterValid });
}
