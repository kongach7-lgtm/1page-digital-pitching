"use client";

import { useRef, useState } from "react";
import { formatFileSize } from "@/lib/format";

// ช่องแนบไฟล์แบบลากวาง (drag & drop) หรือคลิกเลือกไฟล์ก็ได้ — ใช้ DataTransfer sync ค่าลงใน
// <input type="file"> ตัวจริงที่ซ่อนไว้ เพื่อให้โค้ดที่อ่านไฟล์จาก input (FormData หรือ onChange เดิม)
// ใช้ได้เหมือนกับกดเลือกไฟล์ปกติทุกประการ
// พอร์ตมาจาก assignment-hub/components/FileDropzone.tsx (มี guard กัน onClick ยิงซ้อนติดมาด้วย)
export function FileDropzone({
  id,
  name,
  accept,
  required,
  disabled,
  file: controlledFile,
  onFileChange,
  errorMessage,
  hint,
  inputRef,
}: {
  id?: string;
  name?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  // ทั้งสองตัวนี้ปล่อยว่างได้ — ถ้าไม่ส่งมา component จะเก็บ state ไฟล์ไว้เองภายใน
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  errorMessage?: string | null;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [internalFile, setInternalFile] = useState<File | null>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const file = controlledFile !== undefined ? controlledFile : internalFile;

  function setFile(nextFile: File | null) {
    if (controlledFile === undefined) setInternalFile(nextFile);
    onFileChange?.(nextFile);
  }

  function syncNativeInput(nextFile: File | null) {
    if (!ref.current) return;
    const dataTransfer = new DataTransfer();
    if (nextFile) dataTransfer.items.add(nextFile);
    ref.current.files = dataTransfer.files;
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    syncNativeInput(dropped);
    setFile(dropped);
  }

  const borderClass = errorMessage
    ? "border-red-400/60 bg-red-400/10"
    : file
      ? "border-emerald-400/60 bg-emerald-400/10"
      : dragOver
        ? "border-brand-accent bg-brand-accent/10"
        : "border-white/15 bg-white/5 hover:border-white/30";

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          // ref.current.click() ด้านล่างสร้าง click event ใหม่ที่ target คือ <input> ซึ่งเป็นลูกของ
          // div นี้เอง — event นั้น bubble ขึ้นมาถึง div อีกครั้งและมาเข้า onClick นี้ซ้ำ (target จะ
          // กลายเป็น input ไม่ใช่ div) ถ้าไม่กันไว้จะเรียก .click() ซ้อนกันไม่รู้จบ ทำให้ dialog เลือก
          // ไฟล์เปิดแล้วปิดทันที — เช็ค target ก่อนเพื่อรับเฉพาะคลิกจริงจากผู้ใช้
          if (e.target === ref.current) return;
          ref.current?.click();
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) ref.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${borderClass} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <p className="text-sm font-medium text-emerald-300">
            ✓ แนบไฟล์แล้ว: {file.name} ({formatFileSize(file.size)})
          </p>
        ) : (
          <p className="text-sm text-white/50">{hint ?? "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}</p>
        )}
        {file && <p className="mt-1 text-xs text-white/40">คลิกเพื่อเปลี่ยนไฟล์</p>}
      </div>
      {errorMessage && <p className="mt-1 text-sm text-red-400">ไม่สามารถแนบไฟล์ได้: {errorMessage}</p>}
    </div>
  );
}
