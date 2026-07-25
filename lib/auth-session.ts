import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type AdminPayload = { role: "admin" };
export type TeacherPayload = { role: "teacher"; teacherId: number; code: string; name: string };

function signToken(payload: AdminPayload | TeacherPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 12 * 60 * 60,
  path: "/",
};

export function setAdminCookie(res: NextResponse) {
  res.cookies.set("admin_token", signToken({ role: "admin" }), cookieOpts);
}

export function setTeacherCookie(res: NextResponse, teacherId: number, code: string, name: string) {
  res.cookies.set("teacher_token", signToken({ role: "teacher", teacherId, code, name }), cookieOpts);
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.delete("admin_token");
}

export function clearTeacherCookie(res: NextResponse) {
  res.cookies.delete("teacher_token");
}

export function getAdmin(req: NextRequest): AdminPayload | null {
  return verify<AdminPayload>(req.cookies.get("admin_token")?.value);
}

export function getTeacher(req: NextRequest): TeacherPayload | null {
  return verify<TeacherPayload>(req.cookies.get("teacher_token")?.value);
}

export function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}
