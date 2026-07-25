import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, toConfig } from "@/lib/project";
import { UPLOADS_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const studentCount = (
    db.prepare("SELECT COUNT(*) c FROM students WHERE project_id = ?").get(project.id) as { c: number }
  ).c;

  return NextResponse.json({
    id: project.id,
    projectCode: project.project_code,
    studentCount,
    config: toConfig(project),
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const projectName = String(body?.projectName ?? "").trim();
  const tagline = String(body?.tagline ?? "").trim();
  const fieldLabels = Array.isArray(body?.fieldLabels)
    ? body.fieldLabels.map((label: unknown) => String(label ?? "").trim())
    : [];
  const awardCount = Number(body?.awardCount);

  const errors: Record<string, string> = {};
  if (!projectName) errors.projectName = "กรุณากรอกชื่อโปรเจกต์";
  if (fieldLabels.length !== 3 || fieldLabels.some((label: string) => !label)) {
    errors.fieldLabels = "กรุณากรอกหัวข้อให้ครบทั้ง 3 ช่อง";
  }
  if (!Number.isFinite(awardCount) || awardCount < 0 || !Number.isInteger(awardCount)) {
    errors.awardCount = "จำนวนผลงานที่ได้รับรางวัลต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  db.prepare(
    `UPDATE projects SET project_name = ?, tagline = ?, field_label_1 = ?, field_label_2 = ?, field_label_3 = ?, award_count = ?
     WHERE id = ?`
  ).run(projectName, tagline, fieldLabels[0], fieldLabels[1], fieldLabels[2], awardCount, project.id);

  const updated = getOwnedProject(teacher.teacherId, params.id)!;
  return NextResponse.json({ config: toConfig(updated) });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  db.prepare("DELETE FROM projects WHERE id = ?").run(project.id);
  fs.rmSync(path.join(UPLOADS_DIR, String(project.id)), { recursive: true, force: true });

  return NextResponse.json({ ok: true });
}
