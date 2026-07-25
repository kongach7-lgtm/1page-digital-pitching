import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveUploadedImage } from "@/lib/image";
import { getProjectByCode, getVoteCounts, remainingSeconds, toConfig } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });

  const rows = db
    .prepare("SELECT * FROM entries WHERE project_id = ? ORDER BY created_at ASC")
    .all(project.id) as {
    id: number;
    name: string;
    student_id: string;
    field1: string;
    field2: string;
    field3: string;
    image_url: string;
    created_at: number;
  }[];
  const voteCounts = getVoteCounts(project.id);
  const totalVotes = (
    db.prepare("SELECT COUNT(*) c FROM votes WHERE project_id = ?").get(project.id) as { c: number }
  ).c;

  const entries = rows.map((row) => ({
    id: row.id,
    name: row.name,
    studentId: row.student_id,
    field1: row.field1,
    field2: row.field2,
    field3: row.field3,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    voteCount: voteCounts.get(row.id) ?? 0,
  }));

  return NextResponse.json({ entries, totalEntries: entries.length, totalVotes });
}

export async function POST(request: NextRequest, { params }: { params: { code: string } }) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });

  const config = toConfig(project);
  const remaining = remainingSeconds(config.submitTimer);
  if (remaining === null) {
    return NextResponse.json(
      { errors: { field1: "ยังไม่เริ่มช่วงเวลาส่งผลงาน กรุณารออาจารย์เริ่มก่อน" } },
      { status: 403 }
    );
  }
  if (remaining <= 0) {
    return NextResponse.json({ errors: { field1: "หมดเวลาส่งผลงานแล้ว" } }, { status: 403 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const field1 = String(formData.get("field1") ?? "").trim();
  const field2 = String(formData.get("field2") ?? "").trim();
  const field3 = String(formData.get("field3") ?? "").trim();
  const image = formData.get("image");

  const errors: Record<string, string> = {};
  if (!name) errors.name = "กรุณากรอกชื่อ-นามสกุล";
  if (!studentId) errors.studentId = "กรุณากรอกรหัสนักศึกษา";
  if (!field1) errors.field1 = `กรุณากรอก${config.fieldLabels[0]}`;
  if (typeof image === "string" || !image || image.size === 0) {
    errors.image = "กรุณาแนบรูปถ่ายกระดาษ 1 แผ่น";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT 1 FROM entries WHERE project_id = ? AND student_id = ?")
    .get(project.id, studentId);
  if (existing) {
    return NextResponse.json({ errors: { studentId: "รหัสนักศึกษานี้ส่งผลงานไปแล้ว" } }, { status: 409 });
  }

  const imageResult = await saveUploadedImage(image as File, project.id);
  if ("error" in imageResult) {
    return NextResponse.json({ errors: { image: imageResult.error } }, { status: 400 });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO entries (project_id, name, student_id, field1, field2, field3, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(project.id, name, studentId, field1, field2, field3, imageResult.url, Date.now());

    const entry = db.prepare("SELECT * FROM entries WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    // ชนกันตอน insert (คู่ขนานสอดแทรกระหว่างประมวลผลรูป) — UNIQUE(project_id, student_id) กันซ้ำไว้ที่ DB แล้ว
    return NextResponse.json({ errors: { studentId: "รหัสนักศึกษานี้ส่งผลงานไปแล้ว" } }, { status: 409 });
  }
}
