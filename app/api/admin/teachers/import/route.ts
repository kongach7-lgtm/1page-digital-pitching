import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRosterFile } from "@/lib/roster";
import { getAdmin, unauthorized } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  if (!getAdmin(request)) return unauthorized("ต้องเข้าสู่ระบบผู้ดูแลระบบ");

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

  const checkStmt = db.prepare("SELECT 1 FROM teachers WHERE code = ?");
  const insertStmt = db.prepare("INSERT INTO teachers (code, name) VALUES (?, ?)");

  let added = 0;
  let skipped = 0;
  for (const [code, name] of result.roster) {
    if (checkStmt.get(code)) {
      skipped++;
      continue;
    }
    insertStmt.run(code, name);
    added++;
  }

  return NextResponse.json({ ok: true, added, skipped, total: result.roster.size });
}
