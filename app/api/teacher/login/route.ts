import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setTeacherCookie } from "@/lib/auth-session";
import { logTeacherLogin } from "@/lib/loginLog";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "กรุณากรอกรหัส" }, { status: 400 });
  }

  const teacher = db.prepare("SELECT id, code, name FROM teachers WHERE code = ?").get(code) as
    | { id: number; code: string; name: string }
    | undefined;
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบรหัสอาจารย์นี้ในระบบ" }, { status: 401 });
  }

  logTeacherLogin(teacher.id, teacher.code, teacher.name);

  const res = NextResponse.json({ ok: true, name: teacher.name });
  setTeacherCookie(res, teacher.id, teacher.code, teacher.name);
  return res;
}
