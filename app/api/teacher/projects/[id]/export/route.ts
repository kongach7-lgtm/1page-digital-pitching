import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, getVoteCounts, toConfig } from "@/lib/project";

export const dynamic = "force-dynamic";

const RANK_FILL: Record<number, string> = {
  1: "FFF6D9",
  2: "F1F1F1",
  3: "FBE3CE",
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

type EntryRow = {
  id: number;
  name: string;
  student_id: string;
  field1: string;
  field2: string;
  field3: string;
  created_at: number;
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const voteCounts = getVoteCounts(project.id);
  const rows = db
    .prepare("SELECT * FROM entries WHERE project_id = ?")
    .all(project.id) as EntryRow[];
  const entries = rows
    .map((row) => ({ ...row, voteCount: voteCounts.get(row.id) ?? 0 }))
    .sort((a, b) => b.voteCount - a.voteCount || a.created_at - b.created_at);

  const totalVotes = (
    db.prepare("SELECT COUNT(*) c FROM votes WHERE project_id = ?").get(project.id) as { c: number }
  ).c;

  const { fieldLabels, projectName } = toConfig(project);
  const [label1, label2, label3] = fieldLabels;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = projectName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("ผลคะแนนโหวต", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const columnDefs = [
    { header: "อันดับ", width: 8 },
    { header: "ชื่อนักศึกษา", width: 26 },
    { header: "รหัสนักศึกษา", width: 16 },
    { header: label1, width: 26 },
    { header: label2, width: 32 },
    { header: label3, width: 18 },
    { header: "คะแนนโหวต", width: 12 },
    { header: "เวลาส่งงาน", width: 20 },
  ];
  const colCount = columnDefs.length;
  columnDefs.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${projectName} — รายงานผลคะแนนโหวต`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FF9333EA" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `ส่งออกเมื่อ ${new Date().toLocaleString("th-TH")}  ·  ทั้งหมด ${entries.length} ผลงาน  ·  ${totalVotes} โหวต`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { horizontal: "center" };

  const headerRowNum = 4;
  const headerRow = sheet.getRow(headerRowNum);
  columnDefs.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 22;

  entries.forEach((entry, index) => {
    const rank = index + 1;
    const row = sheet.getRow(headerRowNum + 1 + index);
    const values = [
      rank,
      entry.name,
      entry.student_id,
      entry.field1,
      entry.field2,
      entry.field3,
      entry.voteCount,
      new Date(entry.created_at).toLocaleString("th-TH"),
    ];
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 0 || i === 6 ? "center" : "left",
        wrapText: i === 3 || i === 4,
      };
    });
    row.getCell(7).font = { bold: true };

    const fill = RANK_FILL[rank];
    if (fill) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fill}` } };
      });
    } else if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }
  });

  if (entries.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: colCount },
    };
  }
  sheet.views = [{ state: "frozen", ySplit: headerRowNum }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="leaderboard-${project.project_code}-${Date.now()}.xlsx"`,
    },
  });
}
