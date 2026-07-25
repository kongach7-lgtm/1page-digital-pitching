"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EntryCard from "@/components/EntryCard";
import VoteConfirmModal from "@/components/VoteConfirmModal";
import StudentBackground from "@/components/StudentBackground";

type EntryWithVotes = {
  id: number;
  name: string;
  studentId: string;
  imageUrl: string;
  field1: string;
  field2: string;
  field3: string;
  voteCount: number;
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

function getVoterFingerprint(): string {
  const key = "pitching_voter_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

function TimerClock({
  label,
  remaining,
  notStartedText,
  endedText,
}: {
  label: string;
  remaining: number | null;
  notStartedText: string;
  endedText: string;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-2 shadow-lg text-center">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-fuchsia-600 tabular-nums">
        {remaining === null ? "--:--" : formatMMSS(remaining)}
      </p>
      {remaining === null && <p className="text-xs text-slate-400 mt-0.5">{notStartedText}</p>}
      {remaining !== null && remaining <= 0 && (
        <p className="text-xs text-red-500 font-medium mt-0.5">{endedText}</p>
      )}
    </div>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();
  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingEntryId, setVotingEntryId] = useState<number | null>(null);
  const [confirmingEditEntryId, setConfirmingEditEntryId] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [submitTimer, setSubmitTimer] = useState<PhaseTimer>({ durationSeconds: 0, startedAt: null });
  const [voteTimer, setVoteTimer] = useState<PhaseTimer>({ durationSeconds: 0, startedAt: null });
  const [, setTick] = useState(0);

  useEffect(() => {
    const fetchConfig = () => {
      fetch(`/api/p/${code}/config`)
        .then((res) => res.json())
        .then((data) => {
          if (data.config?.projectName) setProjectName(data.config.projectName);
          if (data.config?.fieldLabels) setFieldLabels(data.config.fieldLabels);
          if (data.config?.submitTimer) setSubmitTimer(data.config.submitTimer);
          if (data.config?.voteTimer) setVoteTimer(data.config.voteTimer);
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

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/p/${code}/entries`, { cache: "no-store" });
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotalVotes(data.totalVotes ?? 0);
    } catch {
      // เงียบไว้ รอ poll รอบถัดไป
    } finally {
      setLoaded(true);
    }
  }, [code]);

  useEffect(() => {
    // ใช้ sessionStorage ไม่ใช่ localStorage เพราะเครื่อง/เบราว์เซอร์เดียวกันอาจมีนักศึกษาหลายคน
    // ผลัดกันใช้ (เช่น คอมพิวเตอร์ในห้องเรียน) — localStorage จะติดค้ามข้ามคนไปเรื่อยๆ
    setHasVoted(Boolean(sessionStorage.getItem(`pitching_${code}_voted_studentId`)));
    setCurrentStudentId(sessionStorage.getItem(`pitching_${code}_studentId`));
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries, code]);

  useEffect(() => {
    // ถ้าอาจารย์กด Reset โปรเจกต์ระหว่างที่นักศึกษาที่ login แล้วค้างหน้านี้อยู่
    // ให้เด้งกลับไปหน้าแรกและล้าง session ในเครื่อง เพื่อบังคับให้ login ใหม่เสมอ
    // (ผู้ที่แค่เข้ามาดูกระดานเฉยๆ โดยไม่ได้ login ไม่ต้องเด้ง เพราะไม่มี session ให้ล้าง)
    if (!sessionStorage.getItem(`pitching_${code}_studentId`)) return;

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

  // ตำแหน่งการ์ด (entries) คงที่ตามลำดับส่งเข้ามาเสมอ — อันดับ/ป้าย 🔥 ต้องคำนวณ
  // จากคะแนนโหวตแยกต่างหาก ไม่ใช่ตำแหน่งในกริด ไม่งั้นการ์ดจะสลับที่ตอนมีคนโหวตเพิ่ม
  const voteRankById = useMemo(() => {
    const ranked = [...entries].sort((a, b) => b.voteCount - a.voteCount);
    const map = new Map<number, number>();
    ranked.forEach((entry, index) => map.set(entry.id, index + 1));
    return map;
  }, [entries]);

  const remainingSubmitSeconds = getRemaining(submitTimer);
  const remainingVoteSeconds = getRemaining(voteTimer);
  const votingActive = remainingVoteSeconds !== null && remainingVoteSeconds > 0;
  const votingEnded = remainingVoteSeconds !== null && remainingVoteSeconds <= 0;
  const canEditEntry = remainingSubmitSeconds !== null && remainingSubmitSeconds > 0;

  const redirectedToWinnersRef = useRef(false);
  useEffect(() => {
    // พอหมดเวลาโหวต พานักศึกษาไปหน้าผลรางวัลทันทีให้เห็นผลเลย
    if (votingEnded && !redirectedToWinnersRef.current) {
      redirectedToWinnersRef.current = true;
      router.push(`/p/${code}/winners`);
    }
  }, [votingEnded, router, code]);

  const handleVote = async (voterStudentId: string): Promise<string | null> => {
    if (!votingEntryId || !votingActive) return null;

    const identifiedStudentId = sessionStorage.getItem(`pitching_${code}_studentId`);
    if (identifiedStudentId && voterStudentId !== identifiedStudentId) {
      return "รหัสนักศึกษาไม่ตรงกับที่กรอกไว้ตอนแรก กรุณากรอกรหัสให้ถูกต้อง";
    }

    try {
      const res = await fetch(`/api/p/${code}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: votingEntryId,
          voterStudentId,
          voterFingerprint: getVoterFingerprint(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return data.error ?? "โหวตไม่สำเร็จ กรุณาลองใหม่";
      }
      sessionStorage.setItem(`pitching_${code}_voted_studentId`, voterStudentId);
      setHasVoted(true);
      setVotingEntryId(null);
      fetchEntries();
      return null;
    } catch {
      return "เชื่อมต่อไม่ได้ กรุณาลองใหม่";
    }
  };

  const handleConfirmEdit = async () => {
    if (confirmingEditEntryId === null) return;
    const studentId = sessionStorage.getItem(`pitching_${code}_studentId`);
    if (!studentId) return;

    setEditingEntry(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/p/${code}/entries/${confirmingEditEntryId}?studentId=${encodeURIComponent(studentId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error ?? "แก้ไขผลงานไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      router.push(`/p/${code}/submit`);
    } catch {
      setEditError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setEditingEntry(false);
    }
  };

  return (
    <StudentBackground>
      <div className="fixed top-4 right-4 z-40 flex gap-2">
        <TimerClock
          label="เวลาส่งผลงาน"
          remaining={remainingSubmitSeconds}
          notStartedText="รอเริ่มส่งผลงาน"
          endedText="หมดเวลาส่งผลงานแล้ว"
        />
        <TimerClock
          label="เวลาโหวต"
          remaining={remainingVoteSeconds}
          notStartedText="รอเริ่มโหวต"
          endedText="หมดเวลาโหวตแล้ว"
        />
      </div>
      <main className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-fuchsia-600">{projectName}</h1>
            <p className="text-slate-500 mt-1">
              กระดานผลงาน · {entries.length} ผลงาน · {totalVotes} โหวต
            </p>
            {hasVoted && (
              <p className="text-brand-accent text-sm mt-2 font-medium">
                คุณโหวตแล้ว ขอบคุณที่ร่วมกิจกรรม 🎉
              </p>
            )}
          </header>

          {loaded && entries.length === 0 && (
            <p className="text-center text-slate-400 mt-16">ยังไม่มีผลงานที่ส่งเข้ามา</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                rank={voteRankById.get(entry.id) ?? 1}
                disabled={hasVoted || !votingActive}
                onVote={(entryId) => setVotingEntryId(entryId)}
                onEdit={(entryId) => setConfirmingEditEntryId(entryId)}
                canEdit={canEditEntry}
                fieldLabels={fieldLabels}
                currentStudentId={currentStudentId}
              />
            ))}
          </div>
        </div>

        {votingEntryId !== null && (
          <VoteConfirmModal onClose={() => setVotingEntryId(null)} onConfirm={handleVote} />
        )}

        {confirmingEditEntryId !== null && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50">
            <div className="w-full max-w-sm bg-white border border-white/60 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-fuchsia-600 mb-2">ยืนยันแก้ไขผลงาน</h2>
              <p className="text-slate-500 text-sm mb-5">
                ผลงานที่ส่งไปแล้วจะถูกลบ แล้วพากลับไปหน้าส่งผลงานเพื่อกรอกและส่งใหม่อีกครั้ง
              </p>
              {editError && <p className="text-red-500 text-sm mb-3">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingEditEntryId(null)}
                  className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmEdit}
                  disabled={editingEntry}
                  className="flex-1 rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 transition"
                >
                  {editingEntry ? "กำลังลบ..." : "ยืนยันแก้ไข"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </StudentBackground>
  );
}
