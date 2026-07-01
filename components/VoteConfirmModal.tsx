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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-brand-badge mb-1">ยืนยันการโหวต</h2>
        <p className="text-white/60 text-sm mb-4">
          กรอกรหัสนักศึกษาของคุณเพื่อยืนยัน (โหวตได้ 1 ครั้งเท่านั้น)
        </p>
        <input
          autoFocus
          className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-accent"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="รหัสนักศึกษา"
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 text-white py-2.5 transition"
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
