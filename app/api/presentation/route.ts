import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

// เปิดให้เข้าถึงได้โดยไม่ต้อง login เพื่อความสะดวกเวลาใช้งานจริงในห้องเรียน
// (การอัปโหลด/รีเซ็ตคิวยังคงต้องผ่าน /api/admin/presentation ที่ต้องใช้ passcode)
export async function GET() {
  const groups = Array.from(store.presentationGroups.values()).map((g) => ({
    id: g.id,
    name: g.name,
    link: g.link,
    used: g.used,
  }));
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "ไม่พบรหัสกลุ่ม" }, { status: 400 });
  }

  const group = store.presentationGroups.get(id);
  if (!group) {
    return NextResponse.json({ error: "ไม่พบกลุ่มนี้ในคิว" }, { status: 404 });
  }
  if (group.used) {
    return NextResponse.json({ error: "กลุ่มนี้ถูกเลือกไปแล้ว" }, { status: 409 });
  }

  group.used = true;
  return NextResponse.json({ ok: true, group });
}
