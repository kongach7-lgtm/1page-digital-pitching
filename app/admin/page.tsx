"use client";

import { useCallback, useEffect, useState } from "react";

type EntryWithVotes = {
  id: string;
  ideaName: string;
  name: string;
  studentId: string;
  price: string;
  voteCount: number;
  createdAt: number;
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/entries", { cache: "no-store" });
    const data = await res.json();
    const sorted = (data.entries ?? [])
      .slice()
      .sort((a: EntryWithVotes, b: EntryWithVotes) => b.voteCount - a.voteCount);
    setEntries(sorted);
    setTotalVotes(data.totalVotes ?? 0);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("pitching_admin_passcode");
    if (stored) {
      setPasscode(stored);
      setAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    fetchEntries();
    const interval = setInterval(fetchEntries, 4000);
    return () => clearInterval(interval);
  }, [authorized, fetchEntries]);

  const handleLogin = async () => {
    if (!passcode.trim()) {
      setLoginError("กรุณากรอก passcode");
      return;
    }
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      if (!res.ok) {
        setLoginError("Passcode ไม่ถูกต้อง");
        return;
      }
      sessionStorage.setItem("pitching_admin_passcode", passcode.trim());
      setAuthorized(true);
    } catch {
      setLoginError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/export", {
        headers: { "x-admin-passcode": passcode },
      });
      if (!res.ok) {
        setActionError("Export ไม่สำเร็จ");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leaderboard-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "DELETE",
        headers: { "x-admin-passcode": passcode },
      });
      if (!res.ok) {
        setActionError("Reset ไม่สำเร็จ");
        return;
      }
      setConfirmingReset(false);
      fetchEntries();
    } catch {
      setActionError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setResetting(false);
    }
  };

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-brand-badge mb-4 text-center">Admin Login</h1>
          <input
            type="password"
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
          />
          {loginError && <p className="text-red-400 text-sm mt-2">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full mt-4 rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 transition"
          >
            {loggingIn ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-badge">Admin Dashboard</h1>
            <p className="text-white/60 text-sm mt-1">
              {entries.length} ผลงาน · {totalVotes} โหวต
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {exporting ? "กำลัง Export..." : "Export Excel"}
            </button>
            <button
              onClick={() => setConfirmingReset(true)}
              className="rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium px-4 py-2 transition"
            >
              Reset Session
            </button>
          </div>
        </header>

        {actionError && <p className="text-red-400 text-sm mb-4">{actionError}</p>}

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">อันดับ</th>
                <th className="px-3 py-2 text-left">ชื่อไอเดีย</th>
                <th className="px-3 py-2 text-left">ชื่อนักศึกษา</th>
                <th className="px-3 py-2 text-left">รหัส</th>
                <th className="px-3 py-2 text-left">ราคา</th>
                <th className="px-3 py-2 text-right">โหวต</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{entry.ideaName}</td>
                  <td className="px-3 py-2">{entry.name}</td>
                  <td className="px-3 py-2">{entry.studentId}</td>
                  <td className="px-3 py-2">{entry.price}</td>
                  <td className="px-3 py-2 text-right">{entry.voteCount}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                    ยังไม่มีผลงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmingReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">ยืนยัน Reset Session</h2>
            <p className="text-white/60 text-sm mb-5">
              การดำเนินการนี้จะลบผลงานและโหวตทั้งหมด ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 text-white py-2.5 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 transition"
              >
                {resetting ? "กำลังลบ..." : "ยืนยัน Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
