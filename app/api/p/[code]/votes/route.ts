import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectByCode, remainingSeconds, toConfig } from "@/lib/project";

export async function POST(request: NextRequest, { params }: { params: { code: string } }) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });

  const config = toConfig(project);
  const remaining = remainingSeconds(config.voteTimer);
  if (remaining === null) {
    return NextResponse.json({ error: "ยังไม่เริ่มช่วงเวลาโหวต กรุณารออาจารย์เริ่มก่อน" }, { status: 403 });
  }
  if (remaining <= 0) {
    return NextResponse.json({ error: "หมดเวลาโหวตแล้ว" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const entryId = Number(body?.entryId);
  const voterStudentId = String(body?.voterStudentId ?? "").trim();
  const voterFingerprint = String(body?.voterFingerprint ?? "").trim();

  if (!entryId || !voterStudentId) {
    return NextResponse.json({ error: "กรุณากรอกรหัสนักศึกษา" }, { status: 400 });
  }

  const entry = db
    .prepare("SELECT id, student_id FROM entries WHERE id = ? AND project_id = ?")
    .get(entryId, project.id) as { id: number; student_id: string } | undefined;
  if (!entry) {
    return NextResponse.json({ error: "ไม่พบผลงานนี้" }, { status: 404 });
  }
  if (entry.student_id === voterStudentId) {
    return NextResponse.json({ error: "ไม่สามารถโหวตผลงานของตัวเองได้" }, { status: 403 });
  }

  const alreadyVoted = db
    .prepare("SELECT 1 FROM votes WHERE project_id = ? AND voter_student_id = ?")
    .get(project.id, voterStudentId);
  if (alreadyVoted) {
    return NextResponse.json({ error: "รหัสนักศึกษานี้โหวตไปแล้ว" }, { status: 409 });
  }

  try {
    db.prepare(
      `INSERT INTO votes (project_id, entry_id, voter_student_id, voter_fingerprint, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(project.id, entryId, voterStudentId, voterFingerprint, Date.now());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "รหัสนักศึกษานี้โหวตไปแล้ว" }, { status: 409 });
  }
}
