import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { store, getVoteCounts } from "@/lib/store";
import { saveUploadedImage } from "@/lib/image";
import type { Entry } from "@/lib/types";

export async function GET() {
  const voteCounts = getVoteCounts();
  const entries = Array.from(store.entries.values())
    .map((entry) => ({ ...entry, voteCount: voteCounts.get(entry.id) ?? 0 }))
    .sort((a, b) => b.voteCount - a.voteCount || a.createdAt - b.createdAt);

  return NextResponse.json({
    entries,
    totalEntries: entries.length,
    totalVotes: store.votes.size,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const ideaName = String(formData.get("ideaName") ?? "").trim();
  const problem = String(formData.get("problem") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const image = formData.get("image");

  const errors: Record<string, string> = {};
  if (!name) errors.name = "กรุณากรอกชื่อ-นามสกุล";
  if (!studentId) errors.studentId = "กรุณากรอกรหัสนักศึกษา";
  if (!ideaName) errors.ideaName = "กรุณากรอกชื่อไอเดีย/แบรนด์";
  // เลี่ยงใช้ `instanceof File` เพราะ global File constructor ไม่มีในบาง Node.js runtime
  // (เจอ "ReferenceError: File is not defined" บน production แม้ทำงานปกติในเครื่อง dev)
  if (typeof image === "string" || !image || image.size === 0) {
    errors.image = "กรุณาแนบรูปถ่ายกระดาษ 1 แผ่น";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  if (store.entriesByStudentId.has(studentId)) {
    return NextResponse.json(
      { errors: { studentId: "รหัสนักศึกษานี้ส่งผลงานไปแล้ว" } },
      { status: 409 }
    );
  }

  const imageResult = await saveUploadedImage(image as File);
  if ("error" in imageResult) {
    return NextResponse.json({ errors: { image: imageResult.error } }, { status: 400 });
  }

  // เช็คซ้ำอีกครั้งหลัง await กันกรณีมี request คู่ขนานสอดแทรกระหว่างประมวลผลรูป
  if (store.entriesByStudentId.has(studentId)) {
    return NextResponse.json(
      { errors: { studentId: "รหัสนักศึกษานี้ส่งผลงานไปแล้ว" } },
      { status: 409 }
    );
  }

  const entry: Entry = {
    id: randomUUID(),
    name,
    studentId,
    ideaName,
    problem,
    price,
    imageUrl: imageResult.url,
    createdAt: Date.now(),
  };

  store.entries.set(entry.id, entry);
  store.entriesByStudentId.set(studentId, entry.id);

  return NextResponse.json({ entry }, { status: 201 });
}
