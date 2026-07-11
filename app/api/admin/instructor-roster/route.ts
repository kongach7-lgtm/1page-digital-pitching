import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseRosterFile } from "@/lib/roster";
import { isMasterRequest as isAuthorized } from "@/lib/auth";

// จัดการรายชื่อ "รหัสอาจารย์ที่มีสิทธิ์เข้า Setup Page" — เฉพาะ master passcode เท่านั้น
// ที่แก้ไขรายชื่อนี้ได้ (รหัสอาจารย์ทั่วไปที่อัปโหลดไว้ใช้ล็อกอินได้ แต่แก้รายชื่อไม่ได้)

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }
  return NextResponse.json({ count: store.instructorRoster.size });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (typeof file === "string" || !file || file.size === 0) {
    return NextResponse.json({ error: "กรุณาแนบไฟล์ Excel (.xlsx)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseRosterFile(buffer);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  store.instructorRoster.clear();
  for (const [code, name] of result.roster) {
    store.instructorRoster.set(code, name);
  }

  return NextResponse.json({ ok: true, count: store.instructorRoster.size });
}
