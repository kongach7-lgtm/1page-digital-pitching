import * as XLSX from "xlsx";

export type ParseRosterResult = { roster: Map<string, string> } | { error: string };

export function parseRosterFile(buffer: Buffer): ParseRosterResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { error: "ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง" };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { error: "ไม่พบข้อมูลในไฟล์" };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

  const roster = new Map<string, string>();
  for (const row of rows) {
    const studentId = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim();
    if (studentId && name) {
      roster.set(studentId, name);
    }
  }

  if (roster.size === 0) {
    return { error: "ไม่พบข้อมูลรหัสนักศึกษาในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ (คอลัมน์ A = รหัสนักศึกษา, คอลัมน์ B = ชื่อ-นามสกุล)" };
  }

  return { roster };
}
