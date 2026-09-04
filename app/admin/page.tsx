"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UsageDashboard } from "@/components/UsageDashboard";
import { TeacherActivityPanel } from "@/components/TeacherActivityPanel";

type Teacher = { id: number; code: string; name: string; created_at: string };

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/admin/teachers", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setTeachers(data.teachers ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => {
        if (res.ok) {
          setAuthorized(true);
          fetchTeachers();
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [fetchTeachers]);

  const handleLogin = async () => {
    if (!passcode.trim()) {
      setLoginError("กรุณากรอกรหัส");
      return;
    }
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? "รหัสไม่ถูกต้อง");
        return;
      }
      setAuthorized(true);
      fetchTeachers();
    } catch {
      setLoginError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!newCode.trim() || !newName.trim()) {
      setAddError("กรุณากรอกรหัสและชื่อ-นามสกุลให้ครบ");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode.trim(), name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "เพิ่มไม่สำเร็จ");
        return;
      }
      setNewCode("");
      setNewName("");
      fetchTeachers();
    } catch {
      setAddError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    fetchTeachers();
  };

  const handleDeleteAllTeachers = async () => {
    if (!window.confirm(`ยืนยันลบรายชื่ออาจารย์ทั้งหมด ${teachers.length} คน?\n\nไม่สามารถกู้คืนได้`)) return;
    await fetch("/api/admin/teachers", { method: "DELETE" });
    fetchTeachers();
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setImportError("กรุณาเลือกไฟล์ Excel (.xlsx) ก่อน");
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "นำเข้าไม่สำเร็จ");
        return;
      }
      setImportMessage(`เพิ่มใหม่ ${data.added} คน (ข้าม ${data.skipped} คนที่มีรหัสซ้ำอยู่แล้ว)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchTeachers();
    } catch {
      setImportError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setImporting(false);
    }
  };

  if (checkingAuth) {
    return <main className="min-h-screen" />;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-brand-badge mb-4 text-center">Admin Login</h1>
          <input
            type="password"
            autoComplete="off"
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="รหัสผ่านผู้ดูแลระบบ"
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
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-brand-badge">Admin — จัดการรายชื่ออาจารย์</h1>
          <p className="text-white/60 text-sm mt-1">
            ให้สิทธิ์อาจารย์เข้าไปสร้างและจัดการโปรเจกต์ของตัวเองที่ /teacher/login
          </p>
        </header>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-3">เพิ่มอาจารย์รายคน</h2>
          <div className="flex flex-wrap gap-3">
            <input
              className="flex-1 min-w-[140px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              placeholder="รหัสอาจารย์"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <input
              className="flex-1 min-w-[180px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
              placeholder="ชื่อ-นามสกุล"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              onClick={handleAddTeacher}
              disabled={adding}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </button>
          </div>
          {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white mb-1">นำเข้าจากไฟล์ Excel</h2>
          <p className="text-white/50 text-sm mb-3">
            ไฟล์ .xlsx โดย <span className="text-white/70">คอลัมน์ A = รหัสอาจารย์</span> และ{" "}
            <span className="text-white/70">คอลัมน์ B = ชื่อ-นามสกุล</span> — มีหัวตารางหรือไม่ก็ได้ ตรวจสอบอัตโนมัติ
            รหัสที่มีอยู่แล้วจะถูกข้าม ไม่ทับของเดิม
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-accent file:px-3 file:py-2 file:text-white file:font-medium"
            />
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {importing ? "กำลังนำเข้า..." : "นำเข้า"}
            </button>
          </div>
          {importError && <p className="text-red-400 text-sm mt-2">{importError}</p>}
          {importMessage && <p className="text-green-400 text-sm mt-2">{importMessage}</p>}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">รายชื่ออาจารย์ ({teachers.length} คน)</h2>
          <button
            onClick={handleDeleteAllTeachers}
            disabled={teachers.length === 0}
            className="rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 transition"
          >
            ลบทั้งหมด
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">รหัส</th>
                <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                <th className="px-3 py-2 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{t.code}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDeleteTeacher(t.id)}
                      className="rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 transition"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-white/40">
                    ยังไม่มีอาจารย์ในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TeacherActivityPanel />

        <div className="mt-8">
          <UsageDashboard />
        </div>
      </div>
    </main>
  );
}
