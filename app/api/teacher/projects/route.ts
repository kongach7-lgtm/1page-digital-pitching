import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, generateProjectCode } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { toConfig, type ProjectRow } from "@/lib/project";

export const dynamic = "force-dynamic";

const DEFAULT_LABELS: [string, string, string] = [
  "ชื่อไอเดีย/แบรนด์",
  "ปัญหาที่แก้ไข",
  "ราคาขาย",
];

export async function GET(request: NextRequest) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const rows = db
    .prepare("SELECT * FROM projects WHERE teacher_id = ? ORDER BY created_at DESC")
    .all(teacher.teacherId) as ProjectRow[];

  const projects = rows.map((row) => {
    const entryCount = (
      db.prepare("SELECT COUNT(*) c FROM entries WHERE project_id = ?").get(row.id) as { c: number }
    ).c;
    return { id: row.id, projectCode: row.project_code, entryCount, ...toConfig(row) };
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  // รหัสอาจารย์อาจถูก admin ลบไปแล้วระหว่างที่ยังมี cookie ค้างอยู่ — เช็คก่อน insert
  // กันชน FOREIGN KEY constraint ตอน admin ลบรหัสอาจารย์นี้ออกไปแล้ว
  const teacherExists = db.prepare("SELECT 1 FROM teachers WHERE id = ?").get(teacher.teacherId);
  if (!teacherExists) return unauthorized("บัญชีอาจารย์นี้ถูกลบออกจากระบบแล้ว กรุณาเข้าสู่ระบบใหม่");

  const body = await request.json().catch(() => null);
  const projectName = String(body?.projectName ?? "").trim() || "1-Page Digital Pitching";

  let projectCode = generateProjectCode();
  // กันชนกันแบบหายาก — สุ่มใหม่ถ้าซ้ำ
  while (db.prepare("SELECT 1 FROM projects WHERE project_code = ?").get(projectCode)) {
    projectCode = generateProjectCode();
  }

  const info = db
    .prepare(
      `INSERT INTO projects (teacher_id, project_code, project_name, tagline, field_label_1, field_label_2, field_label_3, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      teacher.teacherId,
      projectCode,
      projectName,
      "ส่งไอเดียธุรกิจของคุณ แล้วโหวตให้เพื่อน",
      DEFAULT_LABELS[0],
      DEFAULT_LABELS[1],
      DEFAULT_LABELS[2],
      randomUUID()
    );

  return NextResponse.json({ ok: true, id: info.lastInsertRowid, projectCode }, { status: 201 });
}
