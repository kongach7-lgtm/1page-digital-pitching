import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@/lib/db";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; filename: string } }
) {
  const { projectId, filename } = params;

  // กัน path traversal — อนุญาตเฉพาะชื่อไฟล์/id ตรงๆ ไม่มี path separator
  if (
    !filename ||
    !projectId ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..") ||
    projectId.includes("/") ||
    projectId.includes("\\") ||
    projectId.includes("..")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, projectId, filename));
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
