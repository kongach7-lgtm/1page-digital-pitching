import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin, setTeacherCookie, unauthorized } from "@/lib/auth-session";

// ให้ Admin "สวมสิทธิ์" เข้าไปดู/จัดการโปรเจกต์ของอาจารย์คนใดคนหนึ่งได้ โดยได้ session เดียวกับที่
// อาจารย์คนนั้นจะได้ตอน login ปกติทุกประการ — ไม่ต้องรู้รหัสอาจารย์เลย
export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return unauthorized("ต้องเข้าสู่ระบบก่อน");

  const body = await request.json().catch(() => null);
  const teacherId = Number(body?.teacherId);
  if (!teacherId) {
    return NextResponse.json({ error: "ไม่พบรหัสอาจารย์ที่ต้องการ" }, { status: 400 });
  }

  const teacher = db.prepare("SELECT id, code, name FROM teachers WHERE id = ?").get(teacherId) as
    | { id: number; code: string; name: string }
    | undefined;
  if (!teacher) return NextResponse.json({ error: "ไม่พบอาจารย์คนนี้" }, { status: 404 });

  const response = NextResponse.json({ ok: true, name: teacher.name });
  setTeacherCookie(response, teacher.id, teacher.code, teacher.name);
  return response;
}
