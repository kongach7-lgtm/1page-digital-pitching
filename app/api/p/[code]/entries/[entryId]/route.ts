import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db, UPLOADS_DIR } from "@/lib/db";
import { getProjectByCode, remainingSeconds, toConfig } from "@/lib/project";

// ลบผลงานของตัวเอง (สำหรับกดแก้ไข-ส่งใหม่) — ยืนยันความเป็นเจ้าของด้วย studentId ที่ตรงกับตอนส่งงาน
// เท่านั้น ไม่มี auth จริงจัง ใช้ระดับความน่าเชื่อถือเดียวกับการส่งผลงาน/โหวตของนักศึกษาทั้งระบบ
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string; entryId: string } }
) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });

  const config = toConfig(project);
  const remaining = remainingSeconds(config.submitTimer);
  if (remaining === null || remaining <= 0) {
    return NextResponse.json({ error: "หมดเวลาแก้ไขผลงานแล้ว" }, { status: 403 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "กรุณาระบุรหัสนักศึกษา" }, { status: 400 });
  }

  const entry = db
    .prepare("SELECT id, student_id, image_url FROM entries WHERE id = ? AND project_id = ?")
    .get(params.entryId, project.id) as { id: number; student_id: string; image_url: string } | undefined;
  if (!entry) return NextResponse.json({ error: "ไม่พบผลงานนี้" }, { status: 404 });
  if (entry.student_id !== studentId) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขผลงานนี้" }, { status: 403 });
  }

  db.prepare("DELETE FROM entries WHERE id = ?").run(entry.id);

  const filename = entry.image_url.split("/").pop();
  if (filename) {
    fs.rmSync(path.join(UPLOADS_DIR, String(project.id), filename), { force: true });
  }

  return NextResponse.json({ ok: true });
}
