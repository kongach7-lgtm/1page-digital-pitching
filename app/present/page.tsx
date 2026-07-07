"use client";

import { useCallback, useEffect, useState } from "react";
import PresentationWheel from "@/components/PresentationWheel";

type Group = { id: string; name: string; link: string; used: boolean };

export default function PresentPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<"list" | "wheel">("list");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/presentation", { cache: "no-store" });
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      // เงียบไว้ รอ poll รอบถัดไป
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(() => {
      if (!busy) fetchGroups();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchGroups, busy]);

  const pick = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เลือกไม่สำเร็จ กรุณาลองใหม่");
        await fetchGroups();
        return;
      }
      window.open(
        `/present/show?name=${encodeURIComponent(data.group.name)}&link=${encodeURIComponent(data.group.link)}`,
        "_blank",
        "noopener"
      );
      await fetchGroups();
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  const unused = groups.filter((g) => !g.used);
  const used = groups.filter((g) => g.used);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-badge">คิวการนำเสนอ</h1>
          <p className="text-white/60 text-sm mt-1">
            เหลือ {unused.length} กลุ่ม จากทั้งหมด {groups.length} กลุ่ม
          </p>
        </header>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode("list")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === "list" ? "bg-brand-accent text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            รายชื่อ
          </button>
          <button
            onClick={() => setMode("wheel")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === "wheel" ? "bg-brand-accent text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            วงล้อสุ่ม
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        {groups.length === 0 && (
          <p className="text-center text-white/40">
            ยังไม่มีรายชื่อกลุ่ม กรุณาให้อาจารย์อัปโหลดไฟล์ Excel ที่หน้า Admin ก่อน
          </p>
        )}

        {mode === "list" && unused.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {unused.map((g) => (
              <button
                key={g.id}
                disabled={busy}
                onClick={() => pick(g.id)}
                className="rounded-xl bg-white/5 border border-white/10 hover:border-brand-accent hover:bg-white/10 disabled:opacity-50 text-white font-medium px-4 py-4 transition"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {mode === "list" && groups.length > 0 && unused.length === 0 && (
          <p className="text-center text-white/40 mb-8">นำเสนอครบทุกกลุ่มแล้ว</p>
        )}

        {mode === "wheel" && (
          <div className="flex justify-center mb-8">
            <PresentationWheel groups={unused} disabled={busy} onPick={(g) => pick(g.id)} />
          </div>
        )}

        {used.length > 0 && (
          <div>
            <h2 className="text-white/50 text-sm mb-2">นำเสนอไปแล้ว ({used.length})</h2>
            <div className="flex flex-wrap gap-2">
              {used.map((g) => (
                <span key={g.id} className="rounded-lg bg-white/5 text-white/30 line-through px-3 py-1 text-sm">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
