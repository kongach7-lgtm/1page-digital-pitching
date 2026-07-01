import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { store } from "@/lib/store";
import type { Vote } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const entryId = String(body?.entryId ?? "").trim();
  const voterStudentId = String(body?.voterStudentId ?? "").trim();
  const voterFingerprint = String(body?.voterFingerprint ?? "").trim();

  if (!entryId || !voterStudentId) {
    return NextResponse.json({ error: "กรุณากรอกรหัสนักศึกษา" }, { status: 400 });
  }

  const entry = store.entries.get(entryId);
  if (!entry) {
    return NextResponse.json({ error: "ไม่พบผลงานนี้" }, { status: 404 });
  }

  if (entry.studentId === voterStudentId) {
    return NextResponse.json({ error: "ไม่สามารถโหวตผลงานของตัวเองได้" }, { status: 403 });
  }

  if (store.votedStudentIds.has(voterStudentId)) {
    return NextResponse.json({ error: "รหัสนักศึกษานี้โหวตไปแล้ว" }, { status: 409 });
  }

  const vote: Vote = {
    id: randomUUID(),
    entryId,
    voterStudentId,
    voterFingerprint,
    createdAt: Date.now(),
  };

  store.votes.set(vote.id, vote);
  store.votedStudentIds.add(voterStudentId);

  return NextResponse.json({ vote }, { status: 201 });
}
