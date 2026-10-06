import { PROFILE_LIMITS, squareCrop } from "@/entities/profile";

export const AVATAR_ACCEPT = ["image/png", "image/jpeg", "image/webp"] as const;
/** Larger originals are refused before decoding; the upload itself is always ≤ 1 MB. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MIN_SOURCE_PX = 96;
const OUTPUT_PX = 512;

export type AvatarProblem = "type" | "tooLarge" | "tooSmall" | "unreadable";

export class AvatarFileError extends Error {
  constructor(readonly problem: AvatarProblem) {
    super(problem);
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>, which some browsers decode more leniently
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Center-crops the picked image to a square, scales it to 512 px and re-encodes it
 * (WebP, else JPEG) under the backend's 1 MB cap. Re-encoding also drops EXIF/GPS data.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!(AVATAR_ACCEPT as readonly string[]).includes(file.type)) throw new AvatarFileError("type");
  if (file.size > MAX_SOURCE_BYTES) throw new AvatarFileError("tooLarge");

  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    throw new AvatarFileError("unreadable");
  }
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  const { sx, sy, size } = squareCrop(width, height);
  if (size < MIN_SOURCE_PX) throw new AvatarFileError("tooSmall");

  const out = Math.min(OUTPUT_PX, size);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AvatarFileError("unreadable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, size, size, 0, 0, out, out);
  if ("close" in image) image.close();

  for (const [type, quality] of [
    ["image/webp", 0.9],
    ["image/webp", 0.75],
    ["image/jpeg", 0.88],
    ["image/jpeg", 0.7],
  ] as const) {
    const blob = await toBlob(canvas, type, quality);
    // Browsers without a WebP encoder silently hand back PNG; skip to JPEG then.
    if (blob && blob.type === type && blob.size <= PROFILE_LIMITS.avatarMaxBytes) return blob;
  }
  throw new AvatarFileError("tooLarge");
}
