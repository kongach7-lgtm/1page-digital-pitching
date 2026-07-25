import { NextResponse } from "next/server";
import { getProjectByCode, toConfig } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const project = getProjectByCode(params.code);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์นี้" }, { status: 404 });
  return NextResponse.json({ config: toConfig(project) });
}
