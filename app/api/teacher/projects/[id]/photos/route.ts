import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import JSZip from "jszip";
import { Resvg } from "@resvg/resvg-js";
import { db, UPLOADS_DIR } from "@/lib/db";
import { getTeacher, unauthorized } from "@/lib/auth-session";
import { getOwnedProject, getVoteCounts } from "@/lib/project";

export const dynamic = "force-dynamic";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [path.join(FONT_DIR, "Kanit-Regular.ttf"), path.join(FONT_DIR, "Kanit-Bold.ttf")];

function renderSvgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Kanit",
    },
  });
  return resvg.render().asPng();
}

const PER_PAGE = 10;
const COLS = 2;
const CELL_SIZE = 400;
const CAPTION_HEIGHT = 70;
const GAP = 20;
const CELL_TOTAL_HEIGHT = CELL_SIZE + CAPTION_HEIGHT;
const CANVAS_WIDTH = COLS * CELL_SIZE + (COLS + 1) * GAP;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

type EntryRow = {
  id: number;
  name: string;
  field1: string;
  image_url: string;
  created_at: number;
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const teacher = getTeacher(request);
  if (!teacher) return unauthorized("ต้องเข้าสู่ระบบในฐานะอาจารย์");

  const project = getOwnedProject(teacher.teacherId, params.id);
  if (!project) return NextResponse.json({ error: "ไม่พบโปรเจกต์" }, { status: 404 });

  const voteCounts = getVoteCounts(project.id);
  const rows = db.prepare("SELECT * FROM entries WHERE project_id = ?").all(project.id) as EntryRow[];
  const entries = rows
    .map((row) => ({ ...row, voteCount: voteCounts.get(row.id) ?? 0 }))
    .sort((a, b) => b.voteCount - a.voteCount || a.created_at - b.created_at);

  if (entries.length === 0) {
    return NextResponse.json({ error: "ยังไม่มีผลงาน" }, { status: 400 });
  }

  const zip = new JSZip();
  const pageCount = Math.ceil(entries.length / PER_PAGE);

  for (let page = 0; page < pageCount; page++) {
    const pageEntries = entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    const composites: sharp.OverlayOptions[] = [];

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = GAP + col * (CELL_SIZE + GAP);
      const y = GAP + row * (CELL_TOTAL_HEIGHT + GAP);

      const filename = entry.image_url.split("/").pop() as string;
      const imagePath = path.join(UPLOADS_DIR, String(project.id), filename);

      let imageBuffer: Buffer;
      try {
        imageBuffer = await sharp(imagePath)
          .resize(CELL_SIZE, CELL_SIZE, {
            fit: "contain",
            background: { r: 241, g: 245, b: 249 },
          })
          .jpeg()
          .toBuffer();
      } catch {
        imageBuffer = await sharp({
          create: { width: CELL_SIZE, height: CELL_SIZE, channels: 3, background: { r: 230, g: 230, b: 230 } },
        })
          .jpeg()
          .toBuffer();
      }
      composites.push({ input: imageBuffer, left: x, top: y });

      const rank = page * PER_PAGE + i + 1;
      const captionSvg = `<svg width="${CELL_SIZE}" height="${CAPTION_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" />
        <text x="50%" y="28" font-size="20" font-family="Kanit" font-weight="700" fill="#1e293b" text-anchor="middle">#${rank} ${escapeXml(truncate(entry.field1, 18))}</text>
        <text x="50%" y="52" font-size="16" font-family="Kanit" font-weight="400" fill="#64748b" text-anchor="middle">${escapeXml(truncate(entry.name, 22))} · ${entry.voteCount} โหวต</text>
      </svg>`;
      const captionBuffer = renderSvgToPng(captionSvg);
      composites.push({ input: captionBuffer, left: x, top: y + CELL_SIZE });
    }

    const rowsUsed = Math.ceil(pageEntries.length / COLS);
    const canvasHeight = rowsUsed * CELL_TOTAL_HEIGHT + (rowsUsed + 1) * GAP;

    const pageBuffer = await sharp({
      create: { width: CANVAS_WIDTH, height: canvasHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer();

    zip.file(`page-${page + 1}.jpg`, pageBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pitching-photos-${project.project_code}-${Date.now()}.zip"`,
    },
  });
}
