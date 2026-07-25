import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db, UPLOADS_DIR } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject } from "@/lib/project";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const entry = db
    .prepare("SELECT id, image_url FROM entries WHERE id = ? AND project_id = ?")
    .get(params.entryId, project.id) as { id: number; image_url: string } | undefined;
  if (!entry) return NextResponse.json({ error: "ไม่พบผลงานนี้" }, { status: 404 });

  db.prepare("DELETE FROM entries WHERE id = ?").run(entry.id);

  const filename = entry.image_url.split("/").pop();
  if (filename) {
    fs.rmSync(path.join(UPLOADS_DIR, String(project.id), filename), { force: true });
  }

  return NextResponse.json({ ok: true });
}
