"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StudentBackground from "@/components/StudentBackground";

const ID_CHECK_DEBOUNCE_MS = 350;

type IdStatus = "idle" | "checking" | "valid" | "invalid" | "submitted" | "instructor";

export default function HomePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [errors, setErrors] = useState<{ studentId?: string }>({});
  const [checking, setChecking] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [tagline, setTagline] = useState("ส่งไอเดียธุรกิจของคุณ แล้วโหวตให้เพื่อน");

  // ผลตรวจสอบรหัสแบบ live ระหว่างพิมพ์ (debounce) — เช็ค 2 ชั้น: รหัสอาจารย์ (setup page)
  // ก่อน แล้วค่อยเช็ครหัสนักศึกษาในรายชื่อที่อาจารย์อัปโหลดไว้
  const [idStatus, setIdStatus] = useState<IdStatus>("idle");
  const idCheckSeq = useRef(0);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.projectName) setProjectName(data.config.projectName);
        if (data.config?.tagline !== undefined) setTagline(data.config.tagline);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = studentId.trim();
    if (!id) {
      setIdStatus("idle");
      setResolvedName("");
      return;
    }
    setIdStatus("checking");
    const seq = ++idCheckSeq.current;
    const timer = setTimeout(async () => {
      try {
        // 1) รหัสนี้เป็นรหัสอาจารย์ (ใช้ล็อกอิน Setup Page) หรือไม่ — ให้อาจารย์เข้าฝั่งนักศึกษา
        // เพื่อพรีวิวหน้าจอได้ด้วยรหัสเดียวกัน
        const codeRes = await fetch(`/api/admin/check-code?code=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const codeData = await codeRes.json();
        if (idCheckSeq.current !== seq) return;
        if (codeData.role) {
          setResolvedName(codeData.name ?? "อาจารย์ผู้ดูแลระบบ");
          setIdStatus("instructor");
          return;
        }

        // 2) ไม่ใช่รหัสอาจารย์ ให้ตรวจกับรายชื่อนักศึกษาที่อาจารย์อัปโหลดไว้
        const res = await fetch(`/api/entries/check?studentId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (idCheckSeq.current !== seq) return; // พิมพ์ต่อไปแล้ว ผลนี้เก่าไม่ใช้
        if (!data.rosterValid) {
          setIdStatus("invalid");
          setResolvedName("");
          return;
        }
        setResolvedName(data.name ?? "");
        if (data.exists) {
          setIdStatus("submitted");
          return;
        }
        setIdStatus("valid");
      } catch {
        if (idCheckSeq.current !== seq) return;
        setIdStatus("invalid");
      }
    }, ID_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [studentId]);

  const handleNext = async () => {
    const id = studentId.trim();
    if (!id) {
      setErrors({ studentId: "กรุณากรอกรหัสนักศึกษา" });
      return;
    }
    setErrors({});
    setAlreadySubmitted(false);

    // รหัสอาจารย์: เข้าฝั่งนักศึกษาได้เพื่อพรีวิว ไม่ต้องตรวจรายชื่อ/สถานะส่งงาน
    if (idStatus === "instructor") {
      setChecking(true);
      try {
        const previewStudentId = `admin-${Math.random().toString(36).slice(2, 8)}`;
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json();
        sessionStorage.setItem("pitching_name", resolvedName || "อาจารย์ผู้ดูแลระบบ");
        sessionStorage.setItem("pitching_studentId", previewStudentId);
        if (data.sessionId) sessionStorage.setItem("pitching_sessionId", data.sessionId);
        router.push("/submit");
      } catch {
        setErrors({ studentId: "เชื่อมต่อไม่ได้ กรุณาลองใหม่" });
      } finally {
        setChecking(false);
      }
      return;
    }

    // ถ้าผลตรวจสอบ live ระหว่างพิมพ์สรุปชัดเจนแล้วว่าไม่ผ่าน ใช้ผลนั้นได้เลยไม่ต้องยิงซ้ำ
    if (idStatus === "invalid") {
      setErrors({ studentId: "ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบและกรอกรหัสนักศึกษาให้ถูกต้อง" });
      return;
    }
    if (idStatus === "submitted") {
      setAlreadySubmitted(true);
      return;
    }
    if (idStatus !== "valid") {
      setErrors({ studentId: "กรุณารอผลการตรวจสอบรหัสสักครู่" });
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/entries/check?studentId=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.rosterValid) {
        setErrors({ studentId: "ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบและกรอกรหัสนักศึกษาให้ถูกต้อง" });
        return;
      }
      if (data.exists) {
        setAlreadySubmitted(true);
        return;
      }
      sessionStorage.setItem("pitching_name", data.name || id);
      sessionStorage.setItem("pitching_studentId", id);
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

          <label className="block mb-6">
            <span className="text-sm text-slate-600">รหัสนักศึกษา</span>
            <input
              className="mt-1 w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              placeholder="เช่น 6501234567"
              autoComplete="off"
            />
            {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>}
            {!errors.studentId && idStatus === "checking" && (
              <p className="text-slate-400 text-sm mt-1">กำลังตรวจสอบ...</p>
            )}
            {!errors.studentId && idStatus === "invalid" && (
              <p className="text-red-500 text-sm mt-1">
                ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบและกรอกรหัสนักศึกษาให้ถูกต้อง
              </p>
            )}
            {!errors.studentId && idStatus === "submitted" && (
              <p className="text-yellow-600 text-sm mt-1">
                รหัสนักศึกษานี้ส่งผลงานไปแล้ว{resolvedName ? ` (${resolvedName})` : ""}
              </p>
            )}
            {!errors.studentId && idStatus === "valid" && (
              <p className="text-green-600 text-sm mt-1">
                ✓ {resolvedName || "พบรหัสนักศึกษานี้ในระบบ"}
              </p>
            )}
            {!errors.studentId && idStatus === "instructor" && (
              <p className="text-green-600 text-sm mt-1">✓ อาจารย์ {resolvedName} (เข้าระบบเพื่อพรีวิว)</p>
            )}
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
