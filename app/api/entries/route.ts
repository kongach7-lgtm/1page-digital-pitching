import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { store, getVoteCounts, remainingSeconds } from "@/lib/store";
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
  const remaining = remainingSeconds(store.config.submitTimer);
  if (remaining === null) {
    return NextResponse.json(
      { errors: { field1: "ยังไม่เริ่มช่วงเวลาส่งผลงาน กรุณารออาจารย์เริ่มก่อน" } },
      { status: 403 }
    );
  }
  if (remaining <= 0) {
    return NextResponse.json(
      { errors: { field1: "หมดเวลาส่งผลงานแล้ว" } },
      { status: 403 }
    );
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
  if (!field1) errors.field1 = `กรุณากรอก${store.config.fieldLabels[0]}`;
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
    field1,
    field2,
    field3,
    imageUrl: imageResult.url,
    createdAt: Date.now(),
  };

  store.entries.set(entry.id, entry);
  store.entriesByStudentId.set(studentId, entry.id);

  return NextResponse.json({ entry }, { status: 201 });
}
