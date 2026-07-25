import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin, unauthorized } from "@/lib/auth-session";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");
  db.prepare("DELETE FROM teachers WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
