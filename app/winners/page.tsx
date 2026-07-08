"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentBackground from "@/components/StudentBackground";

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
  const router = useRouter();
  const [projectName, setProjectName] = useState("1-Page Digital Pitching");
  const [entries, setEntries] = useState<EntryWithVotes[]>([]);
  const [awardCount, setAwardCount] = useState(3);
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    const [entriesRes, configRes] = await Promise.all([
      fetch("/api/entries", { cache: "no-store" }),
      fetch("/api/config"),
    ]);
    const entriesData = await entriesRes.json();
    const configData = await configRes.json();
    // API เรียงตามเวลาส่งเข้ามาให้กระดานผลงานตำแหน่งคงที่ — หน้านี้ต้องเรียงตามโหวตเอง
    const sorted = (entriesData.entries ?? [])
      .slice()
      .sort((a: EntryWithVotes, b: EntryWithVotes) => b.voteCount - a.voteCount);
    setEntries(sorted);
    if (configData.config?.projectName) setProjectName(configData.config.projectName);
    if (configData.config?.awardCount !== undefined) setAwardCount(configData.config.awardCount);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    // ถ้าอาจารย์กด Reset Session ระหว่างที่นักศึกษาที่ login แล้วค้างหน้านี้อยู่
    // ให้เด้งกลับไปหน้าแรกและล้าง session ในเครื่อง เพื่อบังคับให้ login ใหม่เสมอ
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

  const winners = awardCount > 0 ? entries.slice(0, awardCount) : entries;

  return (
    <StudentBackground>
      <main className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-fuchsia-600">🏆 ผลรางวัล</h1>
            <p className="text-slate-500 mt-1">{projectName}</p>
          </header>

          {loaded && winners.length === 0 && (
            <p className="text-center text-slate-400 mt-16">ยังไม่มีผลงานที่ส่งเข้ามา</p>
          )}

          <div className="flex flex-col gap-3">
            {winners.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 rounded-xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-sm p-3"
              >
                <div className="w-10 text-center text-xl font-bold flex-shrink-0">
                  {MEDALS[index] ?? `#${index + 1}`}
                </div>
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.imageUrl}
                    alt={entry.field1}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{entry.name}</p>
                  <p className="text-slate-400 text-sm">รหัส {entry.studentId}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-brand-accent">{entry.voteCount}</p>
                  <p className="text-slate-400 text-xs">โหวต</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </StudentBackground>
  );
}
