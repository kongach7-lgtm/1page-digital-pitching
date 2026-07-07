import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parsePresentationFile } from "@/lib/presentation";

function isAuthorized(request: NextRequest): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return Boolean(passcode) && passcode === process.env.ADMIN_PASSCODE;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }
  const groups = Array.from(store.presentationGroups.values());
  const usedCount = groups.filter((g) => g.used).length;
  return NextResponse.json({ count: groups.length, usedCount });
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
  const result = parsePresentationFile(buffer);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  store.presentationGroups.clear();
  for (const group of result.groups) {
    store.presentationGroups.set(group.id, group);
  }

  return NextResponse.json({ ok: true, count: store.presentationGroups.size });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }
  // นำชื่อกลุ่มที่เลือกไปแล้วทั้งหมดกลับมา โดยไม่ลบข้อมูลกลุ่ม/ลิงก์ทิ้ง
  for (const group of store.presentationGroups.values()) {
    group.used = false;
  }
  return NextResponse.json({ ok: true, count: store.presentationGroups.size });
}
