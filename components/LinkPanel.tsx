"use client";

import { useState } from "react";
import { QrCode } from "./QrCode";

export function LinkPanel({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="font-semibold text-white/90 text-sm">{label}</p>
      <QrCode value={url} size={128} />
      <p className="w-full break-all rounded-lg bg-white/10 px-3 py-2 text-xs text-white/60">{url}</p>
      <div className="flex w-full gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 transition"
        >
          {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-brand-accent hover:bg-orange-600 text-white text-sm font-medium py-2 text-center transition"
        >
          เปิดลิงก์
        </a>
      </div>
    </div>
  );
}
