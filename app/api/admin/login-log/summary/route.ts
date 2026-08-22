import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin, unauthorized } from "@/lib/auth-session";
import { summarizeLoginLog, dailyLoginCounts } from "@/lib/loginLog";

export async function GET(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return unauthorized("ต้องเข้าสู่ระบบก่อน");

  const summary = summarizeLoginLog();
  const totalTeachers = (db.prepare("SELECT COUNT(*) as c FROM teachers").get() as { c: number }).c;
  const totalLogins = summary.reduce((sum, s) => sum + s.login_count, 0);

  return NextResponse.json({
    totalLogins,
    totalTeachers,
    activeTeachers: summary.length,
    summary,
    daily: dailyLoginCounts(14),
  });
}
