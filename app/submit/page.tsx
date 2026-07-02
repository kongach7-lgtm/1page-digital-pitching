"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_LABELS: [string, string, string] = [
  "ชื่อไอเดีย/แบรนด์",
  "ปัญหาที่แก้ไข",
  "ราคาขาย",
];

export default function SubmitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [field3, setField3] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedName = sessionStorage.getItem("pitching_name");
    const storedStudentId = sessionStorage.getItem("pitching_studentId");
    if (!storedName || !storedStudentId) {
      router.replace("/");
      return;
    }
    setName(storedName);
    setStudentId(storedStudentId);
  }, [router]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => data.config?.fieldLabels && setFieldLabels(data.config.fieldLabels))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setErrors((prev) => ({ ...prev, image: "" }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!field1.trim()) nextErrors.field1 = `กรุณากรอก${fieldLabels[0]}`;
    if (!imageFile) nextErrors.image = "กรุณาแนบรูปถ่ายกระดาษ 1 แผ่น";
    if (imageFile && imageFile.size > 5 * 1024 * 1024) nextErrors.image = "ไฟล์รูปต้องไม่เกิน 5MB";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("studentId", studentId);
      formData.append("field1", field1.trim());
      formData.append("field2", field2.trim());
      formData.append("field3", field3.trim());
      formData.append("image", imageFile as File);

      const res = await fetch("/api/entries", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors ?? { field1: "ส่งผลงานไม่สำเร็จ กรุณาลองใหม่" });
        return;
      }

      router.push("/board");
    } catch {
      setErrors({ field1: "เชื่อมต่อไม่ได้ กรุณาลองใหม่" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:py-10">
      <div className="w-full max-w-lg mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-xl sm:text-2xl font-bold text-brand-badge mb-1">
          ส่งผลงาน 1-Page Pitch
        </h1>
        <p className="text-white/60 text-sm mb-6">
          {name} · รหัส {studentId}
        </p>

        {(errors.studentId || errors.name) && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-400/40 text-red-300 text-sm px-3 py-2">
            {errors.studentId || errors.name}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-sm text-white/80">{fieldLabels[0]} *</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={field1}
            onChange={(e) => setField1(e.target.value)}
          />
          {errors.field1 && <p className="text-red-400 text-sm mt-1">{errors.field1}</p>}
        </label>

        <label className="block mb-4">
          <span className="text-sm text-white/80">รูปถ่ายกระดาษ 1 แผ่น *</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="mt-1 w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-accent file:px-3 file:py-2 file:text-white file:font-medium"
          />
          <p className="text-white/40 text-xs mt-1">ขนาดไฟล์ไม่เกิน 5MB</p>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="preview"
              className="mt-3 rounded-lg max-h-64 object-contain border border-white/10"
            />
          )}
          {errors.image && <p className="text-red-400 text-sm mt-1">{errors.image}</p>}
        </label>

        <label className="block mb-4">
          <span className="text-sm text-white/80">{fieldLabels[1]}</span>
          <textarea
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            rows={3}
            value={field2}
            onChange={(e) => setField2(e.target.value)}
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm text-white/80">{fieldLabels[2]}</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={field3}
            onChange={(e) => setField3(e.target.value)}
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
        >
          {submitting ? "กำลังส่ง..." : "ส่งผลงาน"}
        </button>
      </div>
    </main>
  );
}
