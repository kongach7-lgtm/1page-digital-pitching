import { store } from "./store";

// master passcode (ตัวแปรแวดล้อม ADMIN_PASSCODE) จัดการรายชื่อรหัสอาจารย์ได้
// รหัสอาจารย์ที่อัปโหลดไว้ (instructorRoster) ใช้เข้า Setup Page ทำงานประจำวันได้เหมือนกัน
export function isMasterCode(code: string | null | undefined): boolean {
  return Boolean(code) && code === process.env.ADMIN_PASSCODE;
}

export function isAuthorizedAdminCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return isMasterCode(code) || store.instructorRoster.has(code);
}

export function isAuthorizedRequest(request: Request): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return isAuthorizedAdminCode(passcode);
}

export function isMasterRequest(request: Request): boolean {
  const passcode = request.headers.get("x-admin-passcode");
  return isMasterCode(passcode);
}
