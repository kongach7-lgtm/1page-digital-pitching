"use client";

import { useEffect, useState } from "react";

type TeacherLoginSummary = {
  teacher_id: number;
  teacher_code: string;
  teacher_name: string;
  login_count: number;
  first_login_at: number;
  last_login_at: number;
};

type DailyLoginCount = { day: string; count: number };

type SummaryResponse = {
  totalLogins: number;
  totalTeachers: number;
  activeTeachers: number;
  summary: TeacherLoginSummary[];
  daily: DailyLoginCount[];
};

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatDay(day: string) {
  return new Date(day + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function UsageDashboard() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/login-log/summary", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/40 text-sm">
        กำลังโหลดสถิติการใช้งาน...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/40 text-sm">
        โหลดสถิติการใช้งานไม่สำเร็จ
      </div>
    );
  }

  const adoptionRate = data.totalTeachers === 0 ? 0 : Math.round((data.activeTeachers / data.totalTeachers) * 100);
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">สถิติการเข้าใช้งานของอาจารย์</h2>
        <a
          href="/api/admin/login-log/export"
          className="rounded-lg bg-brand-accent hover:bg-orange-600 text-white text-xs font-medium px-4 py-2 transition"
        >
          ดาวน์โหลด Excel ประวัติการเข้าใช้งาน
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40">จำนวนครั้งที่เข้าใช้งานทั้งหมด</p>
          <p className="text-2xl font-bold text-brand-badge mt-1">{data.totalLogins.toLocaleString("th-TH")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40">อาจารย์ที่เคยเข้าใช้งาน</p>
          <p className="text-2xl font-bold text-brand-badge mt-1">
            {data.activeTeachers} <span className="text-sm font-normal text-white/40">/ {data.totalTeachers}</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40">อัตราการใช้งาน</p>
          <p className="text-2xl font-bold text-brand-badge mt-1">{adoptionRate}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/40">อาจารย์ที่เข้าใช้งานบ่อยที่สุด</p>
          <p className="text-sm font-bold text-brand-badge mt-1 leading-snug">
            {data.summary[0] ? `${data.summary[0].teacher_name} (${data.summary[0].login_count})` : "-"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/80 mb-3">แนวโน้มการเข้าใช้งาน 14 วันล่าสุด</p>
        {data.daily.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-6">ยังไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {data.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-orange-600 to-amber-400"
                  style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                  title={`${formatDay(d.day)}: ${d.count} ครั้ง`}
                />
                <span className="text-[9px] text-white/40 whitespace-nowrap">{formatDay(d.day)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">รหัส</th>
              <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2 text-right">จำนวนครั้ง</th>
              <th className="px-3 py-2 text-left">เข้าใช้งานล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {data.summary.map((s) => (
              <tr key={s.teacher_id} className="border-t border-white/10">
                <td className="px-3 py-2 text-white/90">{s.teacher_code}</td>
                <td className="px-3 py-2 text-white/90">{s.teacher_name}</td>
                <td className="px-3 py-2 text-right font-medium text-white/90">{s.login_count}</td>
                <td className="px-3 py-2 text-white/50">{formatDateTime(s.last_login_at)}</td>
              </tr>
            ))}
            {data.summary.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                  ยังไม่มีอาจารย์เข้าใช้งาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
