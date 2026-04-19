import { Router } from "express";
import { SalesAd } from "../models/SalesAd.js";
import { serializeLean } from "../util/serialize.js";

export const salesAdsPublicRouter = Router();

salesAdsPublicRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const raw = await SalesAd.find({ active: true }).sort({ createdAt: -1 }).lean();
    const ads = raw.filter((a) => {
      const vf = a.validFrom ? new Date(a.validFrom) <= now : true;
      const vt = a.validTo ? new Date(a.validTo) >= now : true;
      return vf && vt;
    });
    res.json({
      data: ads.map((a) => serializeLean(a as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});
