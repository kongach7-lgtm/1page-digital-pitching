import { NextRequest, NextResponse } from "next/server";
import { getTeacher, unauthorized } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");
  return NextResponse.json({ name: teacher.name, code: teacher.code });
}
