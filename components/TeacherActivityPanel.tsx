"use client";

import { useEffect, useState } from "react";

type TeacherActivity = {
  id: number;
  code: string;
  name: string;
  project_count: number;
  last_created_at: string;
};

function formatDateTime(sqliteText: string) {
  const iso = sqliteText.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// ให้ Admin กดเข้าไปดู/จัดการโปรเจกต์ของอาจารย์แต่ละคนได้โดยตรง — กดแล้วได้ session เดียวกับที่
// อาจารย์คนนั้น login เอง แล้วพาไปหน้า /teacher/projects ของอาจารย์คนนั้นทันที
export function TeacherActivityPanel() {
  const [teachers, setTeachers] = useState<TeacherActivity[] | null>(null);
  const [enteringId, setEnteringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/teachers-activity", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTeachers(data?.teachers ?? []))
      .catch(() => setTeachers([]));
  }, []);

  const handleEnter = async (teacherId: number) => {
    setError(null);
    setEnteringId(teacherId);
    try {
      const res = await fetch("/api/admin/impersonate-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "เข้าดูไม่สำเร็จ กรุณาลองใหม่");
        setEnteringId(null);
        return;
      }
      window.location.href = "/teacher/projects";
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
      setEnteringId(null);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-brand-badge mb-1">อาจารย์ที่สร้างโปรเจกต์</h2>
      <p className="text-white/50 text-sm mb-4">
        กด &quot;เข้าดู&quot; เพื่อเข้าไปดูและจัดการโปรเจกต์ของอาจารย์คนนั้นในฐานะตัวเขาเอง
      </p>

      {teachers === null && <p className="text-white/40 text-sm py-6 text-center">กำลังโหลด...</p>}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {teachers && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">รหัส</th>
                <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                <th className="px-3 py-2 text-right">จำนวนโปรเจกต์</th>
                <th className="px-3 py-2 text-left">สร้างล่าสุด</th>
                <th className="px-3 py-2 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{t.code}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2 text-right font-medium">{t.project_count}</td>
                  <td className="px-3 py-2 text-white/50">{formatDateTime(t.last_created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEnter(t.id)}
                      disabled={enteringId === t.id}
                      className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition"
                    >
                      {enteringId === t.id ? "กำลังเข้า..." : "เข้าดู"}
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                    ยังไม่มีอาจารย์คนไหนสร้างโปรเจกต์
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
