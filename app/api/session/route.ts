import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// ไม่มี arg และไม่เรียก dynamic API เลย ทำให้ Next.js เข้าใจผิดว่า route นี้ static
// ได้ (bake ค่าตอน build แทนที่จะอ่าน store.sessionId สดทุก request) ต้องบังคับ dynamic ไว้
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sessionId: store.sessionId });
}
