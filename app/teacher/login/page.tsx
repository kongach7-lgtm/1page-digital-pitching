"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [liveName, setLiveName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    fetch("/api/teacher/me")
      .then((res) => {
        if (res.ok) router.replace("/teacher");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      setLiveName(null);
      return;
    }
    const current = ++seq.current;
    const timeout = setTimeout(() => {
      fetch(`/api/teacher/check-code?code=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (current === seq.current) setLiveName(data.valid ? data.name : null);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [code]);

  const handleLogin = async () => {
    if (!code.trim()) {
      setError("กรุณากรอกรหัสอาจารย์");
      return;
    }
    setLoggingIn(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "รหัสไม่ถูกต้อง");
        return;
      }
      router.push("/teacher");
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-brand-badge mb-1 text-center">เข้าสู่ระบบอาจารย์</h1>
        <p className="text-white/50 text-sm text-center mb-4">1-Page Digital Pitching</p>
        <input
          type="text"
          autoComplete="off"
          className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="รหัสอาจารย์"
        />
        {liveName && <p className="text-green-400 text-sm mt-2">✓ {liveName}</p>}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
