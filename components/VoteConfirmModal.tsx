"use client";

import { useState } from "react";

export default function VoteConfirmModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (studentId: string) => Promise<string | null>;
}) {
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!studentId.trim()) {
      setError("กรุณากรอกรหัสนักศึกษา");
      return;
    }
    setLoading(true);
    setError(null);
    const errorMessage = await onConfirm(studentId.trim());
    setLoading(false);
    if (errorMessage) {
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-white border border-white/60 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-fuchsia-600 mb-1">ยืนยันการโหวต</h2>
        <p className="text-slate-500 text-sm mb-4">
          กรอกรหัสนักศึกษาของคุณเพื่อยืนยัน (โหวตได้ 1 ครั้งเท่านั้น)
        </p>
        <input
          autoFocus
          className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-brand-accent"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="รหัสนักศึกษา"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 transition"
          >
            {loading ? "กำลังโหวต..." : "ยืนยันโหวต"}
          </button>
        </div>
      </div>
    </div>
  );
}
