"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type EntryWithVotes = {
  id: string;
  name: string;
  studentId: string;
  field1: string;
  field2: string;
  field3: string;
  voteCount: number;
  createdAt: number;
};

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

function TimerBlock({
  label,
  actionLabel,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
  onStart,
  starting,
  timer,
}: {
  label: string;
  actionLabel: string;
  minutes: number;
  seconds: number;
  onMinutesChange: (value: number) => void;
  onSecondsChange: (value: number) => void;
  onStart: () => void;
  starting: boolean;
  timer: PhaseTimer;
}) {
  const remaining = getRemaining(timer);
  const statusText =
    remaining === null ? "ยังไม่เริ่ม" : remaining <= 0 ? "หมดเวลาแล้ว" : `เหลือเวลา ${formatMMSS(remaining)}`;

  return (
    <div className="rounded-lg border border-white/10 p-3">
      <h3 className="text-sm font-medium text-white/80 mb-2">{label}</h3>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={0}
          className="w-16 rounded-lg bg-white/10 border border-white/20 px-2 py-1.5 text-white text-center focus:outline-none focus:border-brand-accent"
          value={minutes}
          onChange={(e) => onMinutesChange(Math.max(0, Number(e.target.value)))}
        />
        <span className="text-white/50 text-sm">นาที</span>
        <input
          type="number"
          min={0}
          max={59}
          className="w-16 rounded-lg bg-white/10 border border-white/20 px-2 py-1.5 text-white text-center focus:outline-none focus:border-brand-accent"
          value={seconds}
          onChange={(e) => onSecondsChange(Math.min(59, Math.max(0, Number(e.target.value))))}
        />
        <span className="text-white/50 text-sm">วินาที</span>
      </div>
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition text-sm"
      >
        {starting ? "กำลังเริ่ม..." : `เริ่มนับเวลา${actionLabel}`}
      </button>
      <p className="text-white/60 text-sm mt-2">{statusText}</p>
    </div>
  );
}

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

  const [rosterCount, setRosterCount] = useState<number | null>(null);
  const [uploadingRoster, setUploadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const rosterFileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState("");
  const [tagline, setTagline] = useState("");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const [submitTimer, setSubmitTimer] = useState<PhaseTimer>({ durationSeconds: 0, startedAt: null });
  const [voteTimer, setVoteTimer] = useState<PhaseTimer>({ durationSeconds: 0, startedAt: null });
  const [submitMinutes, setSubmitMinutes] = useState(10);
  const [submitSeconds, setSubmitSeconds] = useState(0);
  const [voteMinutes, setVoteMinutes] = useState(5);
  const [voteSeconds, setVoteSeconds] = useState(0);
  const [startingSubmitTimer, setStartingSubmitTimer] = useState(false);
  const [startingVoteTimer, setStartingVoteTimer] = useState(false);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const data = await res.json();
    if (data.config?.projectName) setProjectName(data.config.projectName);
    if (data.config?.tagline !== undefined) setTagline(data.config.tagline);
    if (data.config?.fieldLabels) setFieldLabels(data.config.fieldLabels);
    if (data.config?.submitTimer) {
      setSubmitTimer(data.config.submitTimer);
      if (data.config.submitTimer.durationSeconds > 0) {
        setSubmitMinutes(Math.floor(data.config.submitTimer.durationSeconds / 60));
        setSubmitSeconds(data.config.submitTimer.durationSeconds % 60);
      }
    }
    if (data.config?.voteTimer) {
      setVoteTimer(data.config.voteTimer);
      if (data.config.voteTimer.durationSeconds > 0) {
        setVoteMinutes(Math.floor(data.config.voteTimer.durationSeconds / 60));
        setVoteSeconds(data.config.voteTimer.durationSeconds % 60);
      }
    }
  }, []);

  const fetchRosterCount = useCallback(async (currentPasscode: string) => {
    const res = await fetch("/api/admin/roster", {
      headers: { "x-admin-passcode": currentPasscode },
    });
    if (!res.ok) return;
    const data = await res.json();
    setRosterCount(data.count ?? 0);
  }, []);

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
    fetchRosterCount(passcode);
    fetchConfig();
    const interval = setInterval(() => {
      fetchEntries();
      fetchConfig();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, fetchEntries]);

  useEffect(() => {
    if (!authorized) return;
    const tickInterval = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(tickInterval);
  }, [authorized]);

  const handleStartTimer = async (which: "submit" | "vote", minutes: number, seconds: number) => {
    const durationSeconds = minutes * 60 + seconds;
    setTimerError(null);
    if (which === "submit") setStartingSubmitTimer(true);
    else setStartingVoteTimer(true);
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify({ which, durationSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTimerError(data.error ?? "เริ่มนับเวลาไม่สำเร็จ");
        return;
      }
      if (data.config?.submitTimer) setSubmitTimer(data.config.submitTimer);
      if (data.config?.voteTimer) setVoteTimer(data.config.voteTimer);
    } catch {
      setTimerError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      if (which === "submit") setStartingSubmitTimer(false);
      else setStartingVoteTimer(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigError(null);
    setConfigMessage(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify({ projectName, tagline, fieldLabels }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfigError(data.errors?.projectName ?? data.errors?.fieldLabels ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setConfigMessage("บันทึกการตั้งค่าเรียบร้อย");
    } catch {
      setConfigError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setSavingConfig(false);
    }
  };

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

  const handleRosterUpload = async () => {
    const file = rosterFileInputRef.current?.files?.[0];
    if (!file) {
      setRosterError("กรุณาเลือกไฟล์ Excel (.xlsx) ก่อน");
      return;
    }

    setUploadingRoster(true);
    setRosterError(null);
    setRosterMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "x-admin-passcode": passcode },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setRosterError(data.error ?? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setRosterCount(data.count ?? 0);
      setRosterMessage(`โหลดรายชื่อนักศึกษาแล้ว ${data.count} คน`);
      if (rosterFileInputRef.current) rosterFileInputRef.current.value = "";
    } catch {
      setRosterError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setUploadingRoster(false);
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

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-1">ตั้งค่าโปรเจกต์</h2>
          <p className="text-white/50 text-sm mb-3">
            กำหนดชื่อโปรเจกต์และหัวข้อ 3 ช่องที่นักศึกษาต้องกรอกในหน้าส่งผลงาน (ช่องแรกใช้เป็นชื่อหลักที่แสดงบนการ์ดผลงาน)
          </p>
          <label className="block mb-3">
            <span className="text-sm text-white/80">ชื่อโปรเจกต์</span>
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </label>
          <label className="block mb-3">
            <span className="text-sm text-white/80">ข้อความบรรทัดใต้ชื่อโปรเจกต์ (หน้าลงทะเบียน)</span>
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </label>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            {fieldLabels.map((label, i) => (
              <label key={i} className="block">
                <span className="text-sm text-white/80">หัวข้อที่ {i + 1}{i === 0 ? " (บังคับ)" : ""}</span>
                <input
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
                  value={label}
                  onChange={(e) => {
                    const next = [...fieldLabels] as [string, string, string];
                    next[i] = e.target.value;
                    setFieldLabels(next);
                  }}
                />
              </label>
            ))}
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
          >
            {savingConfig ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
          {configError && <p className="text-red-400 text-sm mt-2">{configError}</p>}
          {configMessage && <p className="text-green-400 text-sm mt-2">{configMessage}</p>}
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-1">ตั้งเวลากิจกรรม</h2>
          <p className="text-white/50 text-sm mb-3">
            นักศึกษาจะส่งผลงาน/โหวตได้ก็ต่อเมื่อกดเริ่มนับเวลาช่วงนั้นๆ แล้วเท่านั้น และจะถูกปิดอัตโนมัติเมื่อหมดเวลา
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <TimerBlock
              label="ช่วงส่งผลงาน"
              actionLabel="ส่งผลงาน"
              minutes={submitMinutes}
              seconds={submitSeconds}
              onMinutesChange={setSubmitMinutes}
              onSecondsChange={setSubmitSeconds}
              onStart={() => handleStartTimer("submit", submitMinutes, submitSeconds)}
              starting={startingSubmitTimer}
              timer={submitTimer}
            />
            <TimerBlock
              label="ช่วงโหวต"
              actionLabel="โหวต"
              minutes={voteMinutes}
              seconds={voteSeconds}
              onMinutesChange={setVoteMinutes}
              onSecondsChange={setVoteSeconds}
              onStart={() => handleStartTimer("vote", voteMinutes, voteSeconds)}
              starting={startingVoteTimer}
              timer={voteTimer}
            />
          </div>
          {timerError && <p className="text-red-400 text-sm mt-2">{timerError}</p>}
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-1">อัปโหลดรายชื่อนักศึกษา (Excel)</h2>
          <p className="text-white/50 text-sm mb-3">
            ไฟล์ .xlsx โดย <span className="text-white/70">คอลัมน์ A = รหัสนักศึกษา</span> และ{" "}
            <span className="text-white/70">คอลัมน์ B = ชื่อ-นามสกุล</span> — เริ่มข้อมูลที่แถวแรกเลย
            (ห้ามมีหัวตาราง) เมื่ออัปโหลดแล้ว ระบบจะตรวจสอบว่ารหัสนักศึกษาที่กรอกหน้าแรกมีอยู่ในรายชื่อนี้ก่อนให้ส่งผลงาน
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={rosterFileInputRef}
              type="file"
              accept=".xlsx"
              className="text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-accent file:px-3 file:py-2 file:text-white file:font-medium"
            />
            <button
              onClick={handleRosterUpload}
              disabled={uploadingRoster}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {uploadingRoster ? "กำลังอัปโหลด..." : "อัปโหลด"}
            </button>
            <span className="text-white/50 text-sm">
              {rosterCount === null
                ? ""
                : rosterCount === 0
                ? "ยังไม่ได้อัปโหลดรายชื่อ (ตอนนี้ทุกรหัสนักศึกษาผ่านได้)"
                : `มีรายชื่อในระบบ ${rosterCount} คน`}
            </span>
          </div>
          {rosterError && <p className="text-red-400 text-sm mt-2">{rosterError}</p>}
          {rosterMessage && <p className="text-green-400 text-sm mt-2">{rosterMessage}</p>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">อันดับ</th>
                <th className="px-3 py-2 text-left">{fieldLabels[0]}</th>
                <th className="px-3 py-2 text-left">ชื่อนักศึกษา</th>
                <th className="px-3 py-2 text-left">รหัส</th>
                <th className="px-3 py-2 text-left">{fieldLabels[2]}</th>
                <th className="px-3 py-2 text-right">โหวต</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{entry.field1}</td>
                  <td className="px-3 py-2">{entry.name}</td>
                  <td className="px-3 py-2">{entry.studentId}</td>
                  <td className="px-3 py-2">{entry.field3}</td>
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
