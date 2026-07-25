import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { db, UPLOADS_DIR } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject } from "@/lib/project";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM votes WHERE project_id = ?").run(project.id);
    db.prepare("DELETE FROM entries WHERE project_id = ?").run(project.id);
    db.prepare(
      `UPDATE projects SET session_id = ?, submit_timer_started_at = NULL, vote_timer_started_at = NULL WHERE id = ?`
    ).run(randomUUID(), project.id);
  });
  tx();

  fs.rmSync(path.join(UPLOADS_DIR, String(project.id)), { recursive: true, force: true });

  return NextResponse.json({ ok: true });
}
