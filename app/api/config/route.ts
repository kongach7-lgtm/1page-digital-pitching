import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

// ไม่มี arg และไม่เรียก dynamic API เลย ทำให้ Next.js เข้าใจผิดว่า route นี้ static
// ได้ (bake ค่า default ตอน build แล้ว method อื่นๆ เช่น PUT หายไปจาก production build)
// ต้องบังคับ dynamic ไว้เพื่อให้ store.config ถูกอ่าน/เขียนสดทุก request
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return Boolean(passcode) && passcode === process.env.ADMIN_PASSCODE;
}

export async function GET() {
  return NextResponse.json({ config: store.config });
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectName = String(body?.projectName ?? "").trim();
  const tagline = String(body?.tagline ?? "").trim();
  const fieldLabels = Array.isArray(body?.fieldLabels)
    ? body.fieldLabels.map((label: unknown) => String(label ?? "").trim())
    : [];

  const errors: Record<string, string> = {};
  if (!projectName) errors.projectName = "กรุณากรอกชื่อโปรเจกต์";
  if (fieldLabels.length !== 3 || fieldLabels.some((label: string) => !label)) {
    errors.fieldLabels = "กรุณากรอกหัวข้อให้ครบทั้ง 3 ช่อง";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  store.config = {
    ...store.config,
    projectName,
    tagline,
    fieldLabels: fieldLabels as [string, string, string],
  };

  return NextResponse.json({ config: store.config });
}
