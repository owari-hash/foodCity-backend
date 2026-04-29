import { Router } from "express";
import { JobPosting } from "../models/JobPosting.js";
import { serializeLean } from "../util/serialize.js";

export const jobsPublicRouter = Router();

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
