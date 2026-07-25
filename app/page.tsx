export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-brand-badge">🚀 1-Page Digital Pitching</h1>
      <p className="text-white/60 max-w-sm">
        ลิงก์สำหรับส่งผลงานและโหวตจะได้จากอาจารย์ผู้สอนของคุณ — ถ้ามาถึงหน้านี้ตรงๆ ให้เข้าสู่ระบบด้านล่าง
      </p>
      <div className="flex gap-3">
        <a href="/teacher/login" className="rounded-lg bg-brand-accent hover:bg-orange-600 px-4 py-2 font-semibold text-white transition">
          เข้าสู่ระบบอาจารย์
        </a>
        <a href="/admin" className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 font-semibold text-white ring-1 ring-white/30 transition">
          ผู้ดูแลระบบ
        </a>
      </div>
    </main>
  );
}
