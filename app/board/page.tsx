"use client";

import { useCallback, useEffect, useState } from "react";
import EntryCard from "@/components/EntryCard";
import VoteConfirmModal from "@/components/VoteConfirmModal";

type EntryWithVotes = {
  id: string;
  ideaName: string;
  name: string;
  studentId: string;
  imageUrl: string;
  problem: string;
  price: string;
  voteCount: number;
};

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
  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

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
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-badge">กระดานผลงาน</h1>
          <p className="text-white/60 mt-1">
            {entries.length} ผลงาน · {totalVotes} โหวต
          </p>
          {hasVoted && (
            <p className="text-brand-accent text-sm mt-2">คุณโหวตแล้ว ขอบคุณที่ร่วมกิจกรรม 🎉</p>
          )}
        </header>

        {loaded && entries.length === 0 && (
          <p className="text-center text-white/40 mt-16">ยังไม่มีผลงานที่ส่งเข้ามา</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              rank={index + 1}
              disabled={hasVoted}
              onVote={(entryId) => setVotingEntryId(entryId)}
            />
          ))}
        </div>
      </div>

      {votingEntryId && (
        <VoteConfirmModal onClose={() => setVotingEntryId(null)} onConfirm={handleVote} />
      )}
    </main>
  );
}
