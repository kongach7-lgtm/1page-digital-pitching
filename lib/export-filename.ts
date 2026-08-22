const ILLEGAL_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;

function sanitizePart(value: string): string {
  return value.replace(ILLEGAL_CHARS, "").replace(/\s+/g, " ").trim();
}

function formatBangkokDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}${get("minute")}`;
}

// รูปแบบชื่อไฟล์มาตรฐานตามที่ก้องขอ ใช้เหมือนกันทุก app ในชุด ActiveLab:
// ชื่อapp_ชื่อผู้สร้างงาน_ชื่องาน_วันเวลาที่สร้างไฟล์
export function buildExportFilename(
  appSlug: string,
  creatorName: string,
  taskName: string,
  extension: string,
  now: Date = new Date()
): string {
  const parts = [appSlug, creatorName, taskName]
    .map(sanitizePart)
    .filter((p) => p.length > 0);
  parts.push(formatBangkokDateTime(now));
  return `${parts.join("_")}.${extension}`;
}

// ใช้กับ Content-Disposition header — ต้องมี ASCII fallback (filename=) คู่กับ UTF-8 จริง (filename*=)
// เพราะชื่อไฟล์มีภาษาไทยซึ่งไม่ใช่ ASCII ตาม RFC 6266 / RFC 5987
export function contentDispositionHeader(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
