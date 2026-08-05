import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin, unauthorized } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");
  const teachers = db
    .prepare("SELECT id, code, name, created_at FROM teachers ORDER BY created_at DESC")
    .all();
  return NextResponse.json({ teachers });
}

export async function POST(request: NextRequest) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  const name = String(body?.name ?? "").trim();
  if (!code || !name) {
    return NextResponse.json({ error: "กรุณากรอกรหัสและชื่อ-นามสกุลให้ครบ" }, { status: 400 });
  }

  const exists = db.prepare("SELECT 1 FROM teachers WHERE code = ?").get(code);
  if (exists) {
    return NextResponse.json({ error: "มีรหัสนี้อยู่ในระบบแล้ว" }, { status: 409 });
  }

  const info = db.prepare("INSERT INTO teachers (code, name) VALUES (?, ?)").run(code, name);
  return NextResponse.json({ ok: true, id: info.lastInsertRowid }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");
  db.prepare("DELETE FROM teachers").run();
  return NextResponse.json({ ok: true });
}
