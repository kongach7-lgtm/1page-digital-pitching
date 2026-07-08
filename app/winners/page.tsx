"use client";

import { useCallback, useEffect, useState } from "react";

type EntryWithVotes = {
  id: string;
  name: string;
  studentId: string;
  imageUrl: string;
  field1: string;
  voteCount: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function WinnersPage() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [awardCount, setAwardCount] = useState(3);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pitching_admin_passcode");
    if (stored) {
      setPasscode(stored);
      setAuthorized(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const [entriesRes, configRes] = await Promise.all([
      fetch("/api/entries", { cache: "no-store" }),
      fetch("/api/config"),
    ]);
    const entriesData = await entriesRes.json();
    const configData = await configRes.json();
    setEntries(entriesData.entries ?? []);
    if (configData.config?.projectName) setProjectName(configData.config.projectName);
    if (configData.config?.awardCount !== undefined) setAwardCount(configData.config.awardCount);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [authorized, fetchData]);

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

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-brand-badge mb-4 text-center">เข้าดูผลรางวัล</h1>
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

  const winners = awardCount > 0 ? entries.slice(0, awardCount) : entries;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-badge">🏆 ผลรางวัล</h1>
          <p className="text-white/60 mt-1">{projectName}</p>
        </header>

        {loaded && winners.length === 0 && (
          <p className="text-center text-white/40 mt-16">ยังไม่มีผลงานที่ส่งเข้ามา</p>
        )}

        <div className="flex flex-col gap-3">
          {winners.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="w-10 text-center text-xl font-bold text-brand-badge flex-shrink-0">
                {MEDALS[index] ?? `#${index + 1}`}
              </div>
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.imageUrl}
                  alt={entry.field1}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{entry.name}</p>
                <p className="text-white/50 text-sm">รหัส {entry.studentId}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-brand-accent">{entry.voteCount}</p>
                <p className="text-white/40 text-xs">โหวต</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
