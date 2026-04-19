import fs from "fs";
import type { Request } from "express";
import multer from "multer";
import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "upload");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

type MulterFile = Express.Multer.File;

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
    const safe = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)
      ? ext
      : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${safe}`);
  },
});

/** Default 15 MiB; override with `UPLOAD_MAX_MB` in `.env`. */
const uploadMaxBytes =
  Math.max(1, Number(process.env.UPLOAD_MAX_MB || "15") || 15) * 1024 * 1024;

export const UPLOAD_MAX_BYTES = uploadMaxBytes;

export const upload = multer({
  storage,
  limits: { fileSize: uploadMaxBytes },
  fileFilter: (_req: Request, file: MulterFile, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});
