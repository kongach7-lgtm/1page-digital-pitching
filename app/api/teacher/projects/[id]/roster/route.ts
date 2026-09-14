import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRosterFile } from "@/lib/roster";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const count = (
    db.prepare("SELECT COUNT(*) c FROM students WHERE project_id = ?").get(project.id) as { c: number }
  ).c;
  return NextResponse.json({ count });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (typeof file === "string" || !file || file.size === 0) {
    return NextResponse.json({ error: "กรุณาแนบไฟล์ Excel (.xlsx)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseRosterFile(buffer);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM students WHERE project_id = ?").run(project.id);
    const insert = db.prepare("INSERT INTO students (project_id, student_id, name) VALUES (?, ?, ?)");
    for (const [studentId, name] of result.roster) {
      insert.run(project.id, studentId, name);
    }
  });
  tx();

  return NextResponse.json({ ok: true, count: result.roster.size });
}

// เพิ่มนักศึกษาทีละคน (ต่างจาก POST ที่อัปโหลดไฟล์แล้วล้างรายชื่อเดิมทั้งหมด)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!studentId || !name) {
    return NextResponse.json({ error: "กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุลให้ครบ" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM students WHERE project_id = ? AND student_id = ?")
    .get(project.id, studentId);
  if (existing) {
    return NextResponse.json({ error: "รหัสนักศึกษานี้มีอยู่ในรายชื่อแล้ว" }, { status: 409 });
  }

  db.prepare("INSERT INTO students (project_id, student_id, name) VALUES (?, ?, ?)").run(
    project.id,
    studentId,
    name
  );

  const count = (
    db.prepare("SELECT COUNT(*) c FROM students WHERE project_id = ?").get(project.id) as { c: number }
  ).c;
  return NextResponse.json({ ok: true, count });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  db.prepare("DELETE FROM students WHERE project_id = ?").run(project.id);
  return NextResponse.json({ ok: true });
}
