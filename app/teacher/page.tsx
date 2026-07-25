"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Project = {
  id: number;
  projectCode: string;
  projectName: string;
  entryCount: number;
};

export default function TeacherProjectsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("1-Page Digital Pitching");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/teacher/projects", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/teacher/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/teacher/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setTeacherName(data.name);
          fetchProjects();
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [router, fetchProjects]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/teacher/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: newName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "สร้างโปรเจกต์ไม่สำเร็จ");
        return;
      }
      router.push(`/teacher/projects/${data.id}`);
    } catch {
      setCreateError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/teacher/logout", { method: "POST" });
    router.push("/teacher/login");
  };

  if (checkingAuth) return <main className="min-h-screen" />;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-badge">โปรเจกต์ของฉัน</h1>
            {teacherName && <p className="text-white/60 text-sm mt-1">{teacherName}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 transition"
          >
            ออกจากระบบ
          </button>
        </header>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-3">สร้างโปรเจกต์ใหม่</h2>
          <div className="flex flex-wrap gap-3">
            <input
              className="flex-1 min-w-[200px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อโปรเจกต์"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {creating ? "กำลังสร้าง..." : "+ สร้างโปรเจกต์"}
            </button>
          </div>
          {createError && <p className="text-red-400 text-sm mt-2">{createError}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/teacher/projects/${p.id}`}
              className="rounded-xl border border-white/10 bg-white/5 hover:border-brand-accent/60 hover:bg-white/10 p-4 transition"
            >
              <h3 className="font-semibold text-white">{p.projectName}</h3>
              <p className="text-white/50 text-sm mt-1">{p.entryCount} ผลงาน · รหัส {p.projectCode}</p>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="text-white/40 text-sm sm:col-span-2 text-center py-8">
              ยังไม่มีโปรเจกต์ — สร้างโปรเจกต์แรกของคุณด้านบน
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
