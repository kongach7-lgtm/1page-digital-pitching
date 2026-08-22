import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAdmin, unauthorized } from "@/lib/auth-session";
import { listLoginLog, summarizeLoginLog } from "@/lib/loginLog";
import { buildExportFilename, contentDispositionHeader } from "@/lib/export-filename";

const HEADER_FILL = "FFEA580C"; // orange-600 — brand color ของ 1-Page Digital Pitching
const ALT_ROW_FILL = "FFFFF7ED";

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
}

function shadeAltRow(row: ExcelJS.Row, index: number) {
  if (index % 2 !== 1) return;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
  });
}

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export async function GET(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return unauthorized("ต้องเข้าสู่ระบบก่อน");

  const summary = summarizeLoginLog();
  const logs = listLoginLog();

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("สรุปตามอาจารย์");
  const summaryHeaderRow = summarySheet.addRow([
    "รหัสอาจารย์",
    "ชื่อ-นามสกุล",
    "จำนวนครั้งที่เข้าใช้งาน",
    "เข้าใช้งานครั้งแรก",
    "เข้าใช้งานล่าสุด",
  ]);
  styleHeaderRow(summaryHeaderRow);
  summary.forEach((s, i) => {
    const row = summarySheet.addRow([
      s.teacher_code,
      s.teacher_name,
      s.login_count,
      formatDateTime(s.first_login_at),
      formatDateTime(s.last_login_at),
    ]);
    shadeAltRow(row, i);
  });
  summarySheet.columns.forEach((col, i) => {
    col.width = i === 1 ? 26 : i === 3 || i === 4 ? 22 : 16;
  });
  summarySheet.views = [{ state: "frozen", ySplit: 1 }];

  const logSheet = workbook.addWorksheet("ประวัติการเข้าใช้งานทั้งหมด");
  const logHeaderRow = logSheet.addRow(["ลำดับ", "รหัสอาจารย์", "ชื่อ-นามสกุล", "วันที่-เวลาที่เข้าใช้งาน"]);
  styleHeaderRow(logHeaderRow);
  logs.forEach((l, i) => {
    const row = logSheet.addRow([i + 1, l.teacher_code, l.teacher_name, formatDateTime(l.logged_in_at)]);
    shadeAltRow(row, i);
  });
  logSheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 8 : i === 2 ? 26 : i === 3 ? 24 : 16;
  });
  logSheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = buildExportFilename("1page-digital-pitching", "Admin", "ประวัติการเข้าใช้งานอาจารย์", "xlsx");
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionHeader(filename),
    },
  });
}
