"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LinkPanel } from "@/components/LinkPanel";
import { FileDropzone } from "@/components/FileDropzone";

type EntryWithVotes = {
  id: number;
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

export default function ProjectDashboardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notFound404, setNotFound404] = useState(false);
  const [projectCode, setProjectCode] = useState("");
  const [origin, setOrigin] = useState("");

  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirmingDeleteEntryId, setConfirmingDeleteEntryId] = useState<number | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const [finishingVoting, setFinishingVoting] = useState(false);

  const [rosterCount, setRosterCount] = useState<number | null>(null);
  const [uploadingRoster, setUploadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [rosterFile, setRosterFile] = useState<File | null>(null);

  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [tagline, setTagline] = useState("");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [awardCount, setAwardCount] = useState(3);
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/teacher/projects/${id}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound404(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setProjectCode(data.projectCode);
    setRosterCount(data.studentCount ?? 0);
    const config = data.config;
    if (config?.projectName) setProjectName(config.projectName);
    if (config?.tagline !== undefined) setTagline(config.tagline);
    if (config?.fieldLabels) setFieldLabels(config.fieldLabels);
    if (config?.awardCount !== undefined) setAwardCount(config.awardCount);
    if (config?.submitTimer) {
      setSubmitTimer(config.submitTimer);
      if (config.submitTimer.durationSeconds > 0) {
        setSubmitMinutes(Math.floor(config.submitTimer.durationSeconds / 60));
        setSubmitSeconds(config.submitTimer.durationSeconds % 60);
      }
    }
    if (config?.voteTimer) {
      setVoteTimer(config.voteTimer);
      if (config.voteTimer.durationSeconds > 0) {
        setVoteMinutes(Math.floor(config.voteTimer.durationSeconds / 60));
        setVoteSeconds(config.voteTimer.durationSeconds % 60);
      }
    }
  }, [id]);

  const fetchTimerStatus = useCallback(async () => {
    const res = await fetch(`/api/teacher/projects/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.config?.submitTimer) setSubmitTimer(data.config.submitTimer);
    if (data.config?.voteTimer) setVoteTimer(data.config.voteTimer);
  }, [id]);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/teacher/projects/${id}/entries`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const sorted = (data.entries ?? [])
      .slice()
      .sort((a: EntryWithVotes, b: EntryWithVotes) => b.voteCount - a.voteCount);
    setEntries(sorted);
    setTotalVotes(data.totalVotes ?? 0);
  }, [id]);

  useEffect(() => {
    fetch("/api/teacher/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/teacher/login");
          return;
        }
        return fetchProject();
      })
      .finally(() => setCheckingAuth(false));
  }, [router, fetchProject]);

  useEffect(() => {
    if (checkingAuth || notFound404) return;
    fetchEntries();
    const interval = setInterval(() => {
      fetchEntries();
      fetchTimerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkingAuth, notFound404, fetchEntries, fetchTimerStatus]);

  useEffect(() => {
    if (checkingAuth) return;
    const tickInterval = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(tickInterval);
  }, [checkingAuth]);

  const handleStartTimer = async (which: "submit" | "vote", minutes: number, seconds: number) => {
    const durationSeconds = minutes * 60 + seconds;
    setTimerError(null);
    if (which === "submit") setStartingSubmitTimer(true);
    else setStartingVoteTimer(true);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/teacher/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, tagline, fieldLabels, awardCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfigError(
          data.errors?.projectName ?? data.errors?.fieldLabels ?? data.errors?.awardCount ?? "บันทึกไม่สำเร็จ"
        );
        return;
      }
      setConfigMessage("บันทึกการตั้งค่าเรียบร้อย");
    } catch {
      setConfigError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRosterUpload = async (file: File) => {
    setUploadingRoster(true);
    setRosterError(null);
    setRosterMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/teacher/projects/${id}/roster`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setRosterError(data.error ?? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setRosterCount(data.count ?? 0);
      setRosterMessage(`โหลดรายชื่อนักศึกษาแล้ว ${data.count} คน`);
      setRosterFile(null);
    } catch {
      setRosterError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setUploadingRoster(false);
    }
  };

  const handleAddStudent = async () => {
    const studentId = newStudentId.trim();
    const name = newStudentName.trim();
    if (!studentId || !name) {
      setAddStudentError("กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุลให้ครบ");
      return;
    }
    setAddingStudent(true);
    setAddStudentError(null);
    setRosterMessage(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddStudentError(data.error ?? "เพิ่มไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setRosterCount(data.count ?? 0);
      setRosterMessage(`เพิ่ม ${name} (${studentId}) แล้ว`);
      setNewStudentId("");
      setNewStudentName("");
    } catch {
      setAddStudentError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setAddingStudent(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/export`);
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

  const handleExportPhotos = async () => {
    setExportingPhotos(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/photos`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error ?? "ดาวน์โหลดภาพไม่สำเร็จ");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pitching-photos-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setExportingPhotos(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    setDeletingEntry(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/entries/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        setActionError("ลบผลงานไม่สำเร็จ");
        return;
      }
      setConfirmingDeleteEntryId(null);
      fetchEntries();
    } catch {
      setActionError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setDeletingEntry(false);
    }
  };

  const handleFinishVoting = async () => {
    setFinishingVoting(true);
    setTimerError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/finish-voting`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTimerError(data.error ?? "จบการโหวตไม่สำเร็จ");
        return;
      }
      if (data.config?.voteTimer) setVoteTimer(data.config.voteTimer);
    } catch {
      setTimerError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setFinishingVoting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}/reset`, { method: "DELETE" });
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

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setActionError("ลบโปรเจกต์ไม่สำเร็จ");
        return;
      }
      router.push("/teacher");
    } catch {
      setActionError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setDeletingProject(false);
    }
  };

  if (checkingAuth) return <main className="min-h-screen" />;

  if (notFound404) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white/70 mb-4">ไม่พบโปรเจกต์นี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link href="/teacher" className="text-brand-accent hover:underline">
            &larr; กลับหน้าโปรเจกต์ของฉัน
          </Link>
        </div>
      </main>
    );
  }

  const studentUrl = origin && projectCode ? `${origin}/p/${projectCode}` : "";
  const boardUrl = origin && projectCode ? `${origin}/p/${projectCode}/board` : "";
  const winnersUrl = origin && projectCode ? `${origin}/p/${projectCode}/winners` : "";

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/teacher" className="inline-flex items-center gap-1 text-sm text-brand-accent hover:underline mb-4">
          &larr; โปรเจกต์ของฉัน
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-badge">{projectName || "Setup Page"}</h1>
            <p className="text-white/60 text-sm mt-1">
              {entries.length} ผลงาน · {totalVotes} โหวต · รหัสโปรเจกต์ {projectCode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {exporting ? "กำลัง Export..." : "Export Excel"}
            </button>
            <button
              onClick={handleExportPhotos}
              disabled={exportingPhotos}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {exportingPhotos ? "กำลังสร้างภาพ..." : "ดาวน์โหลดภาพผลงาน"}
            </button>
            <button
              onClick={() => setConfirmingReset(true)}
              className="rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium px-4 py-2 transition"
            >
              Reset โปรเจกต์
            </button>
            <button
              onClick={() => setConfirmingDeleteProject(true)}
              className="rounded-lg bg-red-800 hover:bg-red-700 text-white font-medium px-4 py-2 transition"
            >
              ลบโปรเจกต์
            </button>
          </div>
        </header>

        {actionError && <p className="text-red-400 text-sm mb-4">{actionError}</p>}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <LinkPanel
            label="ลิงก์สำหรับนักศึกษา (ส่งผลงาน + โหวต)"
            url={studentUrl || "กำลังโหลด..."}
            qrLabel="QR นักศึกษา"
            projectName={projectName}
          />
          <LinkPanel
            label="กระดานผลงาน (โปรเจกเตอร์)"
            url={boardUrl || "กำลังโหลด..."}
            qrLabel="QR กระดานผลงาน"
            projectName={projectName}
          />
          <LinkPanel
            label="ประกาศผลรางวัล"
            url={winnersUrl || "กำลังโหลด..."}
            qrLabel="QR ประกาศผลรางวัล"
            projectName={projectName}
          />
        </div>

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
                <span className="text-sm text-white/80">หัวข้อที่ {i + 1} (บังคับ)</span>
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
          <label className="block mb-3 max-w-xs">
            <span className="text-sm text-white/80">จำนวนผลงานที่ได้รับรางวัลจากการโหวต</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              value={awardCount}
              onChange={(e) => setAwardCount(Math.max(0, Number(e.target.value)))}
            />
            <span className="text-white/40 text-xs">ใช้กำหนดจำนวนอันดับที่แสดงในหน้า "ดูผลรางวัล" (0 = แสดงทั้งหมด)</span>
          </label>
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
            <div>
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
              <button
                onClick={handleFinishVoting}
                disabled={finishingVoting}
                className="w-full mt-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-medium px-4 py-2 transition text-sm"
              >
                {finishingVoting ? "กำลังประมวลผล..." : "โหวตเสร็จหมดแล้ว (จบก่อนหมดเวลา)"}
              </button>
            </div>
          </div>
          {timerError && <p className="text-red-400 text-sm mt-2">{timerError}</p>}
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-3">รายชื่อนักศึกษา</h2>

          <div className="mb-4 pb-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/70 mb-2">เพิ่มรายคน</h3>
            <div className="flex flex-wrap gap-3">
              <input
                className="flex-1 min-w-[140px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
                placeholder="รหัสนักศึกษา"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
              />
              <input
                className="flex-1 min-w-[180px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
                placeholder="ชื่อ-นามสกุล"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
              />
              <button
                onClick={handleAddStudent}
                disabled={addingStudent}
                className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
              >
                {addingStudent ? "กำลังเพิ่ม..." : "เพิ่ม"}
              </button>
            </div>
            {addStudentError && <p className="text-red-400 text-sm mt-2">{addStudentError}</p>}
          </div>

          <h3 className="text-sm font-medium text-white/70 mb-2">อัปโหลดจากไฟล์ Excel (แทนที่รายชื่อเดิมทั้งหมด)</h3>
          <p className="text-white/50 text-sm mb-3">
            ไฟล์ .xlsx โดย <span className="text-white/70">คอลัมน์ A = รหัสนักศึกษา</span> และ{" "}
            <span className="text-white/70">คอลัมน์ B = ชื่อ-นามสกุล</span> — มีหัวตารางหรือไม่ก็ได้ ตรวจสอบอัตโนมัติ
            เมื่ออัปโหลดแล้ว ระบบจะตรวจสอบว่ารหัสนักศึกษาที่กรอกหน้าแรกมีอยู่ในรายชื่อนี้ก่อนให้ส่งผลงาน
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[220px]">
              <FileDropzone
                accept=".xlsx"
                disabled={uploadingRoster}
                file={rosterFile}
                onFileChange={(file) => {
                  setRosterFile(file);
                  if (file) handleRosterUpload(file);
                }}
              />
            </div>
            <span className="text-white/50 text-sm pt-2">
              {uploadingRoster
                ? "กำลังอัปโหลด..."
                : rosterCount === null
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
                <th className="px-3 py-2 text-right">จัดการ</th>
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
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setConfirmingDeleteEntryId(entry.id)}
                      className="rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 transition"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-white/40">
                    ยังไม่มีผลงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmingDeleteEntryId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">ยืนยันลบผลงาน</h2>
            <p className="text-white/60 text-sm mb-5">
              การดำเนินการนี้จะลบผลงานนี้และโหวตที่ได้รับทั้งหมด ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDeleteEntryId(null)}
                className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 text-white py-2.5 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDeleteEntry(confirmingDeleteEntryId)}
                disabled={deletingEntry}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 transition"
              >
                {deletingEntry ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">ยืนยัน Reset โปรเจกต์</h2>
            <p className="text-white/60 text-sm mb-5">
              การดำเนินการนี้จะลบผลงานและโหวตทั้งหมดในโปรเจกต์นี้ ไม่สามารถย้อนกลับได้ (รายชื่อนักศึกษาและการตั้งค่าจะยังอยู่)
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
      {confirmingDeleteProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">ยืนยันลบโปรเจกต์</h2>
            <p className="text-white/60 text-sm mb-5">
              การดำเนินการนี้จะลบโปรเจกต์ &ldquo;{projectName}&rdquo; พร้อมผลงาน โหวต และรายชื่อนักศึกษาทั้งหมดถาวร
              ไม่สามารถย้อนกลับได้ ลิงก์และ QR ของโปรเจกต์นี้จะใช้งานไม่ได้อีกต่อไป
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDeleteProject(false)}
                className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 text-white py-2.5 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="flex-1 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 transition"
              >
                {deletingProject ? "กำลังลบ..." : "ยืนยันลบโปรเจกต์"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
