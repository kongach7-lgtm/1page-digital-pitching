import { NextRequest, NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { store } from "@/lib/store";

function isAuthorized(request: NextRequest): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return Boolean(passcode) && passcode === process.env.ADMIN_PASSCODE;
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }

  store.entries.clear();
  store.entriesByStudentId.clear();
  store.votes.clear();
  store.votedStudentIds.clear();
  // เปลี่ยน sessionId ทุกครั้งที่ reset — หน้า submit/board ของนักศึกษาที่เปิดค้างไว้
  // จะตรวจพบว่าไม่ตรงกับตอน login แล้วเด้งกลับไปหน้าแรกให้ล็อกอินใหม่
  store.sessionId = randomUUID();

  const uploadDir = path.join(process.cwd(), "uploads");
  try {
    const files = await readdir(uploadDir);
    await Promise.all(
      files
        .filter((file) => file !== ".gitkeep")
        .map((file) => unlink(path.join(uploadDir, file)))
    );
  } catch {
    // ไม่มีโฟลเดอร์/ไฟล์ก็ข้ามได้
  }

  return NextResponse.json({ ok: true });
}
