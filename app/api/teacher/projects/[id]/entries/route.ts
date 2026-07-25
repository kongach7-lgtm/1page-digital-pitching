import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, getVoteCounts } from "@/lib/project";

export const dynamic = "force-dynamic";

type EntryRow = {
  id: number;
  name: string;
  student_id: string;
  field1: string;
  field2: string;
  field3: string;
  image_url: string;
  created_at: number;
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const rows = db
    .prepare("SELECT * FROM entries WHERE project_id = ? ORDER BY created_at ASC")
    .all(project.id) as EntryRow[];
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

  return NextResponse.json({ entries, totalVotes });
}
