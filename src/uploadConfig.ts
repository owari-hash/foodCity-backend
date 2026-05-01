import fs from "fs";
import type { Request } from "express";
import multer from "multer";
import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "upload");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

type MulterFile = Express.Multer.File;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".ogg", ".avi"]);

/** Default 200 MiB for images; override with UPLOAD_MAX_MB in .env */
const IMAGE_MAX_BYTES =
  Math.max(1, Number(process.env.UPLOAD_MAX_MB || "200") || 200) * 1024 * 1024;

/** Default 200 MiB for videos; override with UPLOAD_VIDEO_MAX_MB in .env */
const VIDEO_MAX_BYTES =
  Math.max(1, Number(process.env.UPLOAD_VIDEO_MAX_MB || "200") || 200) * 1024 * 1024;

export const UPLOAD_MAX_BYTES = IMAGE_MAX_BYTES;

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: MulterFile,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (
    _req: Request,
    file: MulterFile,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safeExt}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter: (_req: Request, file: MulterFile, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = file.mimetype.startsWith("image/") || IMAGE_EXTS.has(ext);
    const isVideo = file.mimetype.startsWith("video/") || VIDEO_EXTS.has(ext);

    if (!isImage && !isVideo) {
      cb(new Error("Only image or video files are allowed"));
      return;
    }

    // Enforce per-type size limit inside fileFilter using the file stream length isn't
    // possible here — multer checks limits.fileSize against the whole body. We set
    // limits.fileSize to VIDEO_MAX_BYTES (the larger cap) and enforce the image cap
    // in the route handler via UPLOAD_MAX_BYTES.
    cb(null, true);
  },
});
