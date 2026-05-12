import { Router, type Request } from "express";
import { JobPosting } from "../models/JobPosting.js";
import { JobApplication } from "../models/JobApplication.js";
import { serializeLean } from "../util/serialize.js";
import { upload } from "../uploadConfig.js";

type UploadRequest = Request & { file?: Express.Multer.File };

export const jobsPublicRouter = Router();

jobsPublicRouter.post(
  "/upload-cv",
  upload.single("file"),
  (req: UploadRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File field required" });
      }
      const publicPath = `/upload/${req.file.filename}`;
      res.status(201).json({ data: { path: publicPath } });
    } catch (e) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

jobsPublicRouter.get("/", async (req, res, next) => {
  try {
    const lang = ((req.query.lang as string) || "mn") as "mn" | "en";
    const jobs = await JobPosting.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();

    const data = jobs.map((j) => {
      const base = serializeLean(j as Record<string, unknown>)!;
      const langContent = (j[lang] ?? {}) as Record<string, unknown>;
      return {
        id: base.id,
        title: langContent.title ?? "",
        location: langContent.location ?? "",
        description: langContent.description ?? "",
        salary: langContent.salary ?? "",
        company: base.company,
        contactEmail: base.contactEmail,
        imageUrl: base.imageUrl,
        active: base.active,
        postedByUsername: base.postedByUsername,
        postedByDisplayName: base.postedByDisplayName,
        lastEditedByUsername: base.lastEditedByUsername,
        lastEditedByDisplayName: base.lastEditedByDisplayName,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt,
      };
    });

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

jobsPublicRouter.post("/apply", async (req, res, next) => {
  try {
    const { jobId, jobTitle, fullName, phone, email, cvUrl, message } = req.body;
    if (!jobId || !fullName || !phone || !cvUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const app = new JobApplication({
      jobId,
      jobTitle,
      fullName,
      phone,
      email,
      cvUrl,
      message,
    });
    await app.save();

    res.json({ success: true, id: app._id });
  } catch (e) {
    next(e);
  }
});
