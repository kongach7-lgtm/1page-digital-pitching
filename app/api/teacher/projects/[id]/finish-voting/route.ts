import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, toConfig } from "@/lib/project";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  // จบช่วงโหวตทันที (ไม่ต้องรอหมดเวลาที่ตั้งไว้) — ตั้ง duration = 0 กับ startedAt = ตอนนี้
  // ทำให้ remainingSeconds คำนวณได้ 0 ทันที นักศึกษาที่ค้างหน้ากระดานผลงานจะถูกพาไปหน้าผลรางวัลอัตโนมัติ
  db.prepare("UPDATE projects SET vote_timer_duration = 0, vote_timer_started_at = ? WHERE id = ?").run(
    Date.now(),
    project.id
  );

  const updated = getOwnedProject(teacher.teacherId, params.id)!;
  return NextResponse.json({ config: toConfig(updated) });
}
