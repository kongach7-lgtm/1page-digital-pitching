import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseRosterFile } from "@/lib/roster";

function isAuthorized(request: NextRequest): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return Boolean(passcode) && passcode === process.env.ADMIN_PASSCODE;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }
  return NextResponse.json({ count: store.roster.size });
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

  store.roster.clear();
  for (const [studentId, name] of result.roster) {
    store.roster.set(studentId, name);
  }

  return NextResponse.json({ ok: true, count: store.roster.size });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }
  store.roster.clear();
  return NextResponse.json({ ok: true });
}
