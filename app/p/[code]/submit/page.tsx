"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StudentBackground from "@/components/StudentBackground";

const DEFAULT_LABELS: [string, string, string] = [
  "ชื่อไอเดีย/แบรนด์",
  "ปัญหาที่แก้ไข",
  "ราคาขาย",
];

type PhaseTimer = { durationSeconds: number; startedAt: number | null };

function getRemaining(timer: PhaseTimer): number | null {
  if (!timer.startedAt) return null;
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, Math.ceil(timer.durationSeconds - elapsed));
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SubmitPage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [field3, setField3] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitTimer, setSubmitTimer] = useState<PhaseTimer>({ durationSeconds: 0, startedAt: null });
  const [, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedName = sessionStorage.getItem(`pitching_${code}_name`);
    const storedStudentId = sessionStorage.getItem(`pitching_${code}_studentId`);
    if (!storedName || !storedStudentId) {
      router.replace(`/p/${code}`);
      return;
    }
    setName(storedName);
    setStudentId(storedStudentId);
  }, [router, code]);

  useEffect(() => {
    const fetchConfig = () => {
      fetch(`/api/p/${code}/config`)
        .then((res) => res.json())
        .then((data) => {
          if (data.config?.projectName) setProjectName(data.config.projectName);
          if (data.config?.fieldLabels) setFieldLabels(data.config.fieldLabels);
          if (data.config?.submitTimer) setSubmitTimer(data.config.submitTimer);
        })
        .catch(() => {});
    };
    fetchConfig();
    const interval = setInterval(fetchConfig, 5000);
    return () => clearInterval(interval);
  }, [code]);

  useEffect(() => {
    const tickInterval = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    // ถ้าอาจารย์กด Reset โปรเจกต์ระหว่างที่นักศึกษาค้างหน้านี้อยู่ ให้เด้งกลับไปหน้าแรก
    // และล้าง session ในเครื่อง เพื่อบังคับให้ login ใหม่เสมอ
    const checkSession = async () => {
      try {
        const res = await fetch(`/api/p/${code}/config`, { cache: "no-store" });
        const data = await res.json();
        const expected = sessionStorage.getItem(`pitching_${code}_sessionId`);
        if (expected && data.config?.sessionId && data.config.sessionId !== expected) {
          sessionStorage.removeItem(`pitching_${code}_name`);
          sessionStorage.removeItem(`pitching_${code}_studentId`);
          sessionStorage.removeItem(`pitching_${code}_sessionId`);
          sessionStorage.removeItem(`pitching_${code}_voted_studentId`);
          router.replace(`/p/${code}`);
        }
      } catch {
        // เชื่อมต่อไม่ได้ รอ poll รอบถัดไป
      }
    };
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [router, code]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setTouched((prev) => ({ ...prev, image: true }));
    setErrors((prev) => ({ ...prev, image: "" }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const remainingSubmitSeconds = getRemaining(submitTimer);
  const submitTimerActive = remainingSubmitSeconds !== null && remainingSubmitSeconds > 0;

  const fieldErrors: Record<string, string> = {
    ...(!field1.trim() ? { field1: `กรุณากรอก${fieldLabels[0]}` } : {}),
    ...(!field2.trim() ? { field2: `กรุณากรอก${fieldLabels[1]}` } : {}),
    ...(!field3.trim() ? { field3: `กรุณากรอก${fieldLabels[2]}` } : {}),
    ...(!imageFile
      ? { image: "กรุณาแนบรูปถ่ายผลงาน" }
      : imageFile.size > 5 * 1024 * 1024
      ? { image: "ไฟล์รูปต้องไม่เกิน 5MB" }
      : {}),
  };
  const isComplete = Object.keys(fieldErrors).length === 0;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    if (!submitTimerActive) return;
    setTouched({ field1: true, field2: true, field3: true, image: true });
    setErrors(fieldErrors);
    if (!isComplete) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("studentId", studentId);
      formData.append("field1", field1.trim());
      formData.append("field2", field2.trim());
      formData.append("field3", field3.trim());
      formData.append("image", imageFile as File);

      const res = await fetch(`/api/p/${code}/entries`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors ?? { field1: "ส่งผลงานไม่สำเร็จ กรุณาลองใหม่" });
        return;
      }

      router.push(`/p/${code}/board`);
    } catch {
      setErrors({ field1: "เชื่อมต่อไม่ได้ กรุณาลองใหม่" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentBackground>
      <main className="px-4 py-8 sm:py-10">
        <div className="w-full max-w-lg mx-auto bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-xl shadow-orange-100">
          <h1 className="text-xl sm:text-2xl font-bold text-fuchsia-600 mb-1">
            ส่งผลงาน{projectName}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {name} · รหัส {studentId}
          </p>

          {(errors.studentId || errors.name) && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-300 text-red-600 text-sm px-3 py-2">
              {errors.studentId || errors.name}
            </div>
          )}

          {!submitTimerActive && (
            <div className="mb-4 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-sm px-3 py-2 text-center">
              {remainingSubmitSeconds === null
                ? "ยังไม่เริ่มช่วงเวลาส่งผลงาน กรุณารออาจารย์เริ่ม"
                : "หมดเวลาส่งผลงานแล้ว"}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-sm text-slate-600">{fieldLabels[0]} *</span>
            <input
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent disabled:bg-slate-100 disabled:text-slate-400"
              value={field1}
              onChange={(e) => setField1(e.target.value)}
              onBlur={() => handleBlur("field1")}
              disabled={!submitTimerActive}
            />
            {(errors.field1 || (touched.field1 && fieldErrors.field1)) && (
              <p className="text-red-500 text-sm mt-1">{errors.field1 || fieldErrors.field1}</p>
            )}
          </label>

          <label className="block mb-4">
            <span className="text-sm text-slate-600">รูปถ่ายผลงาน *</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              onBlur={() => handleBlur("image")}
              className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-accent file:px-3 file:py-2 file:text-white file:font-medium disabled:file:bg-slate-300"
              disabled={!submitTimerActive}
            />
            <p className="text-slate-400 text-xs mt-1">ขนาดไฟล์ไม่เกิน 5MB</p>
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="preview"
                className="mt-3 rounded-lg max-h-64 object-contain border border-slate-200"
              />
            )}
            {(errors.image || (touched.image && fieldErrors.image)) && (
              <p className="text-red-500 text-sm mt-1">{errors.image || fieldErrors.image}</p>
            )}
          </label>

          <label className="block mb-4">
            <span className="text-sm text-slate-600">{fieldLabels[1]} *</span>
            <textarea
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent disabled:bg-slate-100 disabled:text-slate-400"
              rows={3}
              value={field2}
              onChange={(e) => setField2(e.target.value)}
              onBlur={() => handleBlur("field2")}
              disabled={!submitTimerActive}
            />
            {touched.field2 && fieldErrors.field2 && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.field2}</p>
            )}
          </label>

          <label className="block mb-6">
            <span className="text-sm text-slate-600">{fieldLabels[2]} *</span>
            <input
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent disabled:bg-slate-100 disabled:text-slate-400"
              value={field3}
              onChange={(e) => setField3(e.target.value)}
              onBlur={() => handleBlur("field3")}
              disabled={!submitTimerActive}
            />
            {touched.field3 && fieldErrors.field3 && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.field3}</p>
            )}
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || !submitTimerActive || !isComplete}
              className="flex-1 rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
            >
              {submitting ? "กำลังส่ง..." : "ส่งผลงาน"}
            </button>
            {submitTimerActive && (
              <span className="text-brand-accent font-semibold text-lg tabular-nums whitespace-nowrap">
                {formatMMSS(remainingSubmitSeconds as number)}
              </span>
            )}
          </div>
          {submitTimerActive && !isComplete && (
            <p className="text-amber-600 text-xs text-center mt-2">
              กรุณากรอกข้อมูลให้ครบทุกช่องและแนบรูปถ่ายผลงานก่อนจึงจะส่งผลงานได้
            </p>
          )}
        </div>
      </main>
    </StudentBackground>
  );
}
