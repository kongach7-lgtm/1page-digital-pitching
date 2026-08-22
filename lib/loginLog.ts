import { db } from "./db";

// เก็บ code/name ตอนเข้าใช้งานไว้ตรงๆ ไม่ join กับ teachers ตอน query เพราะเป็น audit log
// ที่ต้องคงอยู่ถาวรแม้ภายหลัง Admin จะลบอาจารย์คนนั้นออกจากรายชื่อแล้วก็ตาม
export function logTeacherLogin(teacherId: number, code: string, name: string) {
  db.prepare(
    "INSERT INTO teacher_login_log (teacher_id, teacher_code, teacher_name, logged_in_at) VALUES (?, ?, ?, ?)"
  ).run(teacherId, code, name, Date.now());
}

export type LoginLogRow = {
  id: number;
  teacher_id: number;
  teacher_code: string;
  teacher_name: string;
  logged_in_at: number;
};

export function listLoginLog(): LoginLogRow[] {
  return db.prepare("SELECT * FROM teacher_login_log ORDER BY logged_in_at DESC").all() as LoginLogRow[];
}

export type TeacherLoginSummary = {
  teacher_id: number;
  teacher_code: string;
  teacher_name: string;
  login_count: number;
  first_login_at: number;
  last_login_at: number;
};

export function summarizeLoginLog(): TeacherLoginSummary[] {
  return db
    .prepare(
      `SELECT teacher_id, teacher_code, teacher_name,
              COUNT(*) as login_count,
              MIN(logged_in_at) as first_login_at,
              MAX(logged_in_at) as last_login_at
       FROM teacher_login_log
       GROUP BY teacher_id
       ORDER BY login_count DESC`
    )
    .all() as TeacherLoginSummary[];
}

export type DailyLoginCount = { day: string; count: number };

// ย้อนหลัง N วัน (รวมวันนี้) นับตามเวลาท้องถิ่นเครื่อง server (Railway ตั้ง TZ เป็น UTC โดย default
// แต่ก็ยังสม่ำเสมอพอสำหรับดูแนวโน้ม ไม่ต้องแม่นระดับ timezone ผู้ใช้แต่ละคน)
export function dailyLoginCounts(days: number): DailyLoginCount[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return db
    .prepare(
      `SELECT date(logged_in_at / 1000, 'unixepoch') as day, COUNT(*) as count
       FROM teacher_login_log
       WHERE logged_in_at >= ?
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(since) as DailyLoginCount[];
}
