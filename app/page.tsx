"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; studentId?: string }>({});
  const [checking, setChecking] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => data.config?.projectName && setProjectName(data.config.projectName))
      .catch(() => {});
  }, []);

  const handleNext = async () => {
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = "กรุณากรอกชื่อ-นามสกุล";
    if (!studentId.trim()) nextErrors.studentId = "กรุณากรอกรหัสนักศึกษา";
    setErrors(nextErrors);
    setAlreadySubmitted(false);
    if (Object.keys(nextErrors).length > 0) return;

    setChecking(true);
    try {
      const res = await fetch(
        `/api/entries/check?studentId=${encodeURIComponent(studentId.trim())}`
      );
      const data = await res.json();
      if (!data.rosterValid) {
        setErrors({ studentId: "ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบและกรอกรหัสนักศึกษาให้ถูกต้อง" });
        return;
      }
      if (data.exists) {
        setAlreadySubmitted(true);
        return;
      }
      sessionStorage.setItem("pitching_name", name.trim());
      sessionStorage.setItem("pitching_studentId", studentId.trim());
      router.push("/submit");
    } catch {
      setErrors({ studentId: "เชื่อมต่อไม่ได้ กรุณาลองใหม่" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-badge text-center mb-1">
          {projectName}
        </h1>
        <p className="text-center text-white/60 mb-6">ส่งไอเดียธุรกิจของคุณ แล้วโหวตให้เพื่อน</p>

        <label className="block mb-4">
          <span className="text-sm text-white/80">ชื่อ-นามสกุล</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น สมชาย ใจดี"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </label>

        <label className="block mb-6">
          <span className="text-sm text-white/80">รหัสนักศึกษา</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="เช่น 6501234567"
          />
          {errors.studentId && <p className="text-red-400 text-sm mt-1">{errors.studentId}</p>}
        </label>

        {alreadySubmitted && (
          <div className="mb-4 rounded-lg bg-yellow-500/10 border border-yellow-400/40 text-yellow-200 text-sm px-3 py-2">
            รหัสนักศึกษานี้ส่งผลงานไปแล้ว —{" "}
            <a href="/board" className="underline font-medium">
              ไปหน้ากระดานผลงาน
            </a>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={checking}
          className="w-full rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
        >
          {checking ? "กำลังตรวจสอบ..." : "ถัดไป"}
        </button>

        <p className="text-center text-white/40 text-sm mt-4">
          หรือ{" "}
          <a href="/board" className="underline">
            ดูกระดานผลงาน
          </a>
        </p>
      </div>
    </main>
  );
}
