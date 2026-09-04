import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin, unauthorized } from "@/lib/auth-session";

// รายชื่ออาจารย์ที่เคยสร้างโปรเจกต์อย่างน้อย 1 โปรเจกต์ พร้อมจำนวน — ใช้ในหน้า Admin เพื่อเลือก
// เข้าไปดู/จัดการโปรเจกต์ของอาจารย์แต่ละคน (ดู POST /api/admin/impersonate-teacher)
export async function GET(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return unauthorized("ต้องเข้าสู่ระบบก่อน");

  const rows = db
    .prepare(
      `SELECT t.id, t.code, t.name,
              COUNT(p.id) as project_count,
              MAX(p.created_at) as last_created_at
       FROM teachers t
       JOIN projects p ON p.teacher_id = t.id
       GROUP BY t.id
       ORDER BY project_count DESC`
    )
    .all() as { id: number; code: string; name: string; project_count: number; last_created_at: string }[];

  return NextResponse.json({ teachers: rows });
}
