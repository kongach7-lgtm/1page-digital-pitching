import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAuthorizedRequest } from "@/lib/auth";

// ไม่มี arg และไม่เรียก dynamic API เลย ทำให้ Next.js เข้าใจผิดว่า route นี้ static ได้
// (bake ค่าตอน build แล้ว method อื่นๆ เช่น POST หายไปจาก production build) ต้องบังคับ dynamic ไว้
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Passcode ไม่ถูกต้อง" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const which = body?.which;
  const durationSeconds = Number(body?.durationSeconds);

  if (which !== "submit" && which !== "vote") {
    return NextResponse.json({ error: "ระบุช่วงเวลาไม่ถูกต้อง" }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: "กรุณาตั้งเวลาให้มากกว่า 0 วินาที" }, { status: 400 });
  }

  const timer = { durationSeconds, startedAt: Date.now() };
  if (which === "submit") {
    store.config.submitTimer = timer;
  } else {
    store.config.voteTimer = timer;
  }

  return NextResponse.json({ config: store.config });
}
