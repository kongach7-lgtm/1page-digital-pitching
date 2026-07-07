"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function PresentShowContent() {
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const link = params.get("link") ?? "";

  const [minutesInput, setMinutesInput] = useState(5);
  const [secondsInput, setSecondsInput] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleStart = () => {
    const total = Math.max(0, minutesInput) * 60 + Math.max(0, Math.min(59, secondsInput));
    if (total <= 0) return;
    setRemaining(total);
    setRunning(true);
  };

  const handleResetTimer = () => {
    setRunning(false);
    setRemaining(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const timeUp = remaining === 0;
  const mm = String(Math.floor((remaining ?? 0) / 60)).padStart(2, "0");
  const ss = String((remaining ?? 0) % 60).padStart(2, "0");

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative">
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        {remaining === null ? (
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
            <input
              type="number"
              min={0}
              value={minutesInput}
              onChange={(e) => setMinutesInput(Number(e.target.value))}
              className="w-14 rounded-md bg-white/10 border border-white/20 px-2 py-1 text-white text-center"
              aria-label="นาที"
            />
            <span className="text-white/60">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={secondsInput}
              onChange={(e) => setSecondsInput(Number(e.target.value))}
              className="w-14 rounded-md bg-white/10 border border-white/20 px-2 py-1 text-white text-center"
              aria-label="วินาที"
            />
            <button
              onClick={handleStart}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 text-white font-semibold px-3 py-1.5 transition"
            >
              เริ่ม
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-xl px-4 py-2 font-mono text-3xl font-bold tabular-nums ${
                timeUp ? "bg-red-600 animate-pulse text-white" : "bg-black/60 text-brand-badge"
              }`}
            >
              {mm}:{ss}
            </div>
            <button onClick={handleResetTimer} className="text-xs text-white/50 underline">
              ตั้งเวลาใหม่
            </button>
          </>
        )}
      </div>

      <div className="w-full max-w-5xl">
        <div className="rounded-[28px] border-[10px] border-brand-badge bg-black shadow-2xl overflow-hidden aspect-video">
          {link ? (
            <iframe src={link} className="w-full h-full" allow="fullscreen" allowFullScreen title={name || "presentation"} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50">ไม่พบลิงก์การนำเสนอ</div>
          )}
        </div>
        <div className="text-center mt-3">
          <p className="text-lg font-semibold text-white">{name}</p>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 underline">
              หากไม่แสดงผล คลิกเพื่อเปิดลิงก์ต้นฉบับ
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PresentShowPage() {
  return (
    <Suspense fallback={null}>
      <PresentShowContent />
    </Suspense>
  );
}
