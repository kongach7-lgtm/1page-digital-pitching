import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// DATA_DIR ต้องชี้ไปที่ Railway volume (ถาวรข้าม redeploy) — ถ้าไม่ตั้งค่า จะใช้ ./data
// ในเครื่อง (มี .gitignore กันไว้แล้ว)
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const globalForDb = globalThis as unknown as { __pitchingDb?: Database.Database };

// เปิดฐานข้อมูลแบบ lazy (ตอนถูกเรียกใช้จริงครั้งแรกเท่านั้น) ห้ามเปิดตอน import
// module เพราะตอน `next build` ทำ "Collecting page data" มันจะ import ทุก route
// พร้อมกันในหลาย worker process — ถ้าเปิดไฟล์ตอนนั้นจะชนกันจนได้ "database is locked"
// (SQLITE_BUSY) ทำให้ build ล้มเหลว
function ensureDb(): Database.Database {
  if (globalForDb.__pitchingDb) return globalForDb.__pitchingDb;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const instance = new Database(path.join(DATA_DIR, "app.db"));
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '',
      field_label_1 TEXT NOT NULL DEFAULT 'ชื่อไอเดีย/แบรนด์',
      field_label_2 TEXT NOT NULL DEFAULT 'ปัญหาที่แก้ไข',
      field_label_3 TEXT NOT NULL DEFAULT 'ราคาขาย',
      award_count INTEGER NOT NULL DEFAULT 3,
      session_id TEXT NOT NULL DEFAULT '',
      submit_timer_duration INTEGER NOT NULL DEFAULT 0,
      submit_timer_started_at INTEGER,
      vote_timer_duration INTEGER NOT NULL DEFAULT 0,
      vote_timer_started_at INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(project_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      field1 TEXT NOT NULL DEFAULT '',
      field2 TEXT NOT NULL DEFAULT '',
      field3 TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(project_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      voter_student_id TEXT NOT NULL,
      voter_fingerprint TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(project_id, voter_student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_teacher ON projects(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_students_project ON students(project_id);
    CREATE INDEX IF NOT EXISTS idx_entries_project ON entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_votes_project_entry ON votes(project_id, entry_id);
  `);

  globalForDb.__pitchingDb = instance;
  return instance;
}

// Proxy เพื่อให้ทุกที่ยังเรียกใช้ผ่าน `db.prepare(...)` ได้เหมือนเดิม แต่จริงๆ
// แล้วฐานข้อมูลจะยังไม่ถูกเปิดจนกว่าจะมีการเรียก method/property ครั้งแรก (runtime)
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const instance = ensureDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function generateProjectCode(): string {
  return Math.random().toString(36).slice(2, 8);
}
