import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectByCode, toConfig } from "@/lib/project";

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });

  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() ?? "";

  const exists = Boolean(
    studentId &&
      db.prepare("SELECT 1 FROM entries WHERE project_id = ? AND student_id = ?").get(project.id, studentId)
  );

  const rosterCount = (
    db.prepare("SELECT COUNT(*) c FROM students WHERE project_id = ?").get(project.id) as { c: number }
  ).c;
  // ถ้าอาจารย์ยังไม่ได้อัปโหลดรายชื่อ (roster ว่าง) ให้ผ่านได้ทุกรหัสเหมือนเดิม
  const student = studentId
    ? (db
        .prepare("SELECT name FROM students WHERE project_id = ? AND student_id = ?")
        .get(project.id, studentId) as { name: string } | undefined)
    : undefined;
  const rosterValid = rosterCount === 0 || Boolean(student);

  return NextResponse.json({
    exists,
    rosterValid,
    name: student?.name,
    sessionId: toConfig(project).sessionId,
  });
}
