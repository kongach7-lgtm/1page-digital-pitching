import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { UPLOADS_DIR } from "./db";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];

export type SaveImageResult = { url: string } | { error: string };

export async function saveUploadedImage(file: File, projectId: number): Promise<SaveImageResult> {
  if (!file || file.size === 0) {
    return { error: "กรุณาแนบรูปถ่ายกระดาษ 1 แผ่น" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "ไฟล์รูปต้องไม่เกิน 5MB" };
  }

  const isAllowedType =
    ALLOWED_TYPES.includes(file.type) || /\.(jpe?g|png|heic|heif)$/i.test(file.name);
  if (!isAllowedType) {
    return { error: "รองรับเฉพาะไฟล์ JPG, PNG, HEIC" };
  }

  const projectDir = path.join(UPLOADS_DIR, String(projectId));
  await mkdir(projectDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.jpg`;

  try {
    await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toFile(path.join(projectDir, filename));
    return { url: `/api/uploads/${projectId}/${filename}` };
  } catch {
    const ext = path.extname(file.name) || ".jpg";
    const fallbackName = `${randomUUID()}${ext}`;
    await writeFile(path.join(projectDir, fallbackName), buffer);
    return { url: `/api/uploads/${projectId}/${fallbackName}` };
  }
}
