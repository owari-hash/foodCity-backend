import { Router } from "express";
import { JobPosting } from "../models/JobPosting.js";
import { serializeLean } from "../util/serialize.js";

export const jobsPublicRouter = Router();

jobsPublicRouter.get("/", async (req, res, next) => {
  try {
    const lang = (req.query.lang as string) || "mn";
    const jobs = await JobPosting.find({ active: true, language: lang })
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      data: jobs.map((j) => serializeLean(j as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});
