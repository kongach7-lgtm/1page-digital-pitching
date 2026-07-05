"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentBackground from "@/components/StudentBackground";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; studentId?: string }>({});
  const [checking, setChecking] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [tagline, setTagline] = useState("ส่งไอเดียธุรกิจของคุณ แล้วโหวตให้เพื่อน");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.projectName) setProjectName(data.config.projectName);
        if (data.config?.tagline !== undefined) setTagline(data.config.tagline);
      })
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
      if (data.sessionId) sessionStorage.setItem("pitching_sessionId", data.sessionId);
      router.push("/submit");
    } catch {
      setErrors({ studentId: "เชื่อมต่อไม่ได้ กรุณาลองใหม่" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <StudentBackground>
      <main className="flex items-center justify-center px-4 py-10 min-h-screen">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-xl shadow-orange-100">
          <h1 className="text-2xl sm:text-3xl font-bold text-fuchsia-600 text-center mb-1">
            {projectName}
          </h1>
          {tagline && <p className="text-center text-slate-500 mb-6">{tagline}</p>}

          <label className="block mb-4">
            <span className="text-sm text-slate-600">ชื่อ-นามสกุล</span>
            <input
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </label>

          <label className="block mb-6">
            <span className="text-sm text-slate-600">รหัสนักศึกษา</span>
            <input
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="เช่น 6501234567"
            />
            {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>}
          </label>

          {alreadySubmitted && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm px-3 py-2">
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

          <p className="text-center text-slate-400 text-sm mt-4">
            หรือ{" "}
            <a href="/board" className="underline">
              ดูกระดานผลงาน
            </a>
          </p>
        </div>
      </main>
    </StudentBackground>
  );
}
