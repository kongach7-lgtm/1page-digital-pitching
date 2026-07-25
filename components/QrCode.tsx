import { QRCodeSVG } from "qrcode.react";

export function QrCode({ value, size = 120 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-lg bg-white p-2">
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}
