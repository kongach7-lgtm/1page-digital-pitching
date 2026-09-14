import { QRCodeCanvas } from "qrcode.react";

// ใช้ QRCodeCanvas (ไม่ใช่ QRCodeSVG) เพื่อให้ LinkPanel ดึง canvas ไป toDataURL() ดาวน์โหลดเป็น
// ไฟล์รูปได้ — ต้องรับ id ผ่านมาจากภายนอกเพื่อให้หาตัว canvas เจอตอนกดดาวน์โหลด
export function QrCode({ value, size = 120, id }: { value: string; size?: number; id?: string }) {
  return (
    <div className="inline-block rounded-lg bg-white p-2">
      <QRCodeCanvas id={id} value={value} size={size} level="M" />
    </div>
  );
}
