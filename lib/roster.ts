import * as XLSX from "xlsx";

export type ParseRosterResult = { roster: Map<string, string> } | { error: string };

// คอลัมน์รหัส (A) คือสัญญาณที่แม่นยำที่สุดว่าแถวแรกเป็นหัวตาราง — รหัสจริง (ตัวเลข/username) แทบ
// เป็นไปไม่ได้ที่จะมีคำว่า "รหัส"/"code"/"id"/"username" ปนอยู่ในตัวเอง จึงตรวจแบบ "มีคำนี้อยู่" ได้เลย
const CODE_HEADER_KEYWORDS = ["รหัส", "code", "id", "username"];
// คอลัมน์ชื่อ (B) ต้องตรวจแบบ "ตรงกันเป๊ะ" เท่านั้น ไม่ใช่แค่มีคำนี้ปนอยู่ในข้อความ เพราะชื่อจริงบางคน
// อาจมีคำเหล่านี้ปนอยู่ได้โดยที่แถวนั้นไม่ใช่หัวตารางเลย
const EXACT_NAME_HEADERS = ["ชื่อ", "ชื่อ-นามสกุล", "ชื่อสกุล", "ชื่อ นามสกุล", "name"];

function cellContainsKeyword(value: unknown, keywords: string[]): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return keywords.some((k) => normalized.includes(k.toLowerCase()));
}

function cellExactlyMatches(value: unknown, labels: string[]): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return labels.some((l) => normalized === l.toLowerCase());
}

function isHeaderRow(row: unknown[] | undefined): boolean {
  if (!row) return false;
  return (
    cellContainsKeyword(row[0], CODE_HEADER_KEYWORDS) ||
    cellExactlyMatches(row[1], EXACT_NAME_HEADERS)
  );
}

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

  // มีหัวตารางหรือไม่ก็ได้ ตรวจสอบอัตโนมัติ: ถ้าแถวแรกดูเหมือนหัวตาราง (เช่น "รหัสนักศึกษา",
  // "ชื่อ-นามสกุล") จะข้ามแถวนั้นแล้วเริ่มอ่านจากแถวที่ 2 ไม่งั้นเริ่มอ่านข้อมูลจริงตั้งแต่แถวแรกเลย
  const dataRows = isHeaderRow(rows[0]) ? rows.slice(1) : rows;

  const roster = new Map<string, string>();
  for (const row of dataRows) {
    const studentId = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim();
    if (studentId && name) {
      roster.set(studentId, name);
    }
  }

  if (roster.size === 0) {
    return { error: "ไม่พบข้อมูลรหัสนักศึกษาในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ (คอลัมน์ A = รหัสนักศึกษา, คอลัมน์ B = ชื่อ-นามสกุล, มีหัวตารางหรือไม่ก็ได้)" };
  }

  return { roster };
}
