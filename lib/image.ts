import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];

export type SaveImageResult = { url: string } | { error: string };

export async function saveUploadedImage(file: File): Promise<SaveImageResult> {
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

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.jpg`;

  try {
    await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toFile(path.join(UPLOAD_DIR, filename));
    return { url: `/uploads/${filename}` };
  } catch {
    const ext = path.extname(file.name) || ".jpg";
    const fallbackName = `${randomUUID()}${ext}`;
    await writeFile(path.join(UPLOAD_DIR, fallbackName), buffer);
    return { url: `/uploads/${fallbackName}` };
  }
}
