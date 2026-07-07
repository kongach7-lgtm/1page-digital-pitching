import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import type { PresentationGroup } from "./types";

export type ParsePresentationResult = { groups: PresentationGroup[] } | { error: string };

export function parsePresentationFile(buffer: Buffer): ParsePresentationResult {
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

  const groups: PresentationGroup[] = [];
  for (const row of rows) {
    const name = String(row[0] ?? "").trim();
    const link = String(row[1] ?? "").trim();
    if (name && link) {
      groups.push({ id: randomUUID(), name, link, used: false });
    }
  }

  if (groups.length === 0) {
    return {
      error:
        "ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ (คอลัมน์ A = ชื่อกลุ่ม, คอลัมน์ B = ลิงก์ไฟล์นำเสนอ)",
    };
  }

  return { groups };
}
