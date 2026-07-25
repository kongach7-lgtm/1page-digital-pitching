import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, toConfig } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const which = body?.which;
  const durationSeconds = Number(body?.durationSeconds);

  if (which !== "submit" && which !== "vote") {
    return NextResponse.json({ error: "ระบุช่วงเวลาไม่ถูกต้อง" }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: "กรุณาตั้งเวลาให้มากกว่า 0 วินาที" }, { status: 400 });
  }

  const startedAt = Date.now();
  if (which === "submit") {
    db.prepare("UPDATE projects SET submit_timer_duration = ?, submit_timer_started_at = ? WHERE id = ?").run(
      durationSeconds,
      startedAt,
      project.id
    );
  } else {
    db.prepare("UPDATE projects SET vote_timer_duration = ?, vote_timer_started_at = ? WHERE id = ?").run(
      durationSeconds,
      startedAt,
      project.id
    );
  }

  const updated = getOwnedProject(teacher.teacherId, params.id)!;
  return NextResponse.json({ config: toConfig(updated) });
}
