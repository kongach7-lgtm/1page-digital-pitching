import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { store, getVoteCount } from "@/lib/store";

function isAuthorized(request: NextRequest): boolean {
  const passcode =
    request.headers.get("x-admin-passcode") ?? request.nextUrl.searchParams.get("passcode");
  return Boolean(passcode) && passcode === process.env.ADMIN_PASSCODE;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }

  const entries = Array.from(store.entries.values())
    .map((entry) => ({ ...entry, voteCount: getVoteCount(entry.id) }))
    .sort((a, b) => b.voteCount - a.voteCount || a.createdAt - b.createdAt);

  const rows = entries.map((entry, index) => ({
    อันดับ: index + 1,
    ชื่อไอเดีย: entry.ideaName,
    ชื่อนักศึกษา: entry.name,
    รหัสนักศึกษา: entry.studentId,
    ปัญหาที่แก้: entry.problem,
    ราคาขาย: entry.price,
    คะแนนโหวต: entry.voteCount,
    เวลาส่งงาน: new Date(entry.createdAt).toLocaleString("th-TH"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="leaderboard-${Date.now()}.xlsx"`,
    },
  });
}
