"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EntryCard from "@/components/EntryCard";
import VoteConfirmModal from "@/components/VoteConfirmModal";
import StudentBackground from "@/components/StudentBackground";

type EntryWithVotes = {
  id: string;
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

function getVoterFingerprint(): string {
  const key = "pitching_voter_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export default function BoardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [fieldLabels, setFieldLabels] = useState<[string, string, string]>(DEFAULT_LABELS);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.projectName) setProjectName(data.config.projectName);
        if (data.config?.fieldLabels) setFieldLabels(data.config.fieldLabels);
      })
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries", { cache: "no-store" });
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotalVotes(data.totalVotes ?? 0);
    } catch {
      // เงียบไว้ รอ poll รอบถัดไป
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // ใช้ sessionStorage ไม่ใช่ localStorage เพราะเครื่อง/เบราว์เซอร์เดียวกันอาจมีนักศึกษาหลายคน
    // ผลัดกันใช้ (เช่น คอมพิวเตอร์ในห้องเรียน) — localStorage จะติดค้ามข้ามคนไปเรื่อยๆ
    setHasVoted(Boolean(sessionStorage.getItem("pitching_voted_studentId")));
    setCurrentStudentId(sessionStorage.getItem("pitching_studentId"));
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  useEffect(() => {
    // ถ้าอาจารย์กด Reset Session ระหว่างที่นักศึกษาที่ login แล้วค้างหน้านี้อยู่
    // ให้เด้งกลับไปหน้าแรกและล้าง session ในเครื่อง เพื่อบังคับให้ login ใหม่เสมอ
    // (ผู้ที่แค่เข้ามาดูกระดานเฉยๆ โดยไม่ได้ login ไม่ต้องเด้ง เพราะไม่มี session ให้ล้าง)
    if (!sessionStorage.getItem("pitching_studentId")) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json();
        const expected = sessionStorage.getItem("pitching_sessionId");
        if (expected && data.sessionId && data.sessionId !== expected) {
          sessionStorage.removeItem("pitching_name");
          sessionStorage.removeItem("pitching_studentId");
          sessionStorage.removeItem("pitching_sessionId");
          sessionStorage.removeItem("pitching_voted_studentId");
          localStorage.removeItem("pitching_voter_token");
          router.replace("/");
        }
      } catch {
        // เชื่อมต่อไม่ได้ รอ poll รอบถัดไป
      }
    };
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleVote = async (voterStudentId: string): Promise<string | null> => {
    if (!votingEntryId) return null;

    const identifiedStudentId = sessionStorage.getItem("pitching_studentId");
    if (identifiedStudentId && voterStudentId !== identifiedStudentId) {
      return "รหัสนักศึกษาไม่ตรงกับที่กรอกไว้ตอนแรก กรุณากรอกรหัสให้ถูกต้อง";
    }

    try {
      const res = await fetch("/api/votes", {
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
      sessionStorage.setItem("pitching_voted_studentId", voterStudentId);
      setHasVoted(true);
      setVotingEntryId(null);
      fetchEntries();
      return null;
    } catch {
      return "เชื่อมต่อไม่ได้ กรุณาลองใหม่";
    }
  };

  return (
    <StudentBackground>
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
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                rank={index + 1}
                disabled={hasVoted}
                onVote={(entryId) => setVotingEntryId(entryId)}
                fieldLabels={fieldLabels}
                currentStudentId={currentStudentId}
              />
            ))}
          </div>
        </div>

        {votingEntryId && (
          <VoteConfirmModal onClose={() => setVotingEntryId(null)} onConfirm={handleVote} />
        )}
      </main>
    </StudentBackground>
  );
}
