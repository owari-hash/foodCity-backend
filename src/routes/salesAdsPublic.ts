import { Router } from "express";
import { SalesAd } from "../models/SalesAd.js";
import { serializeLean } from "../util/serialize.js";

export const salesAdsPublicRouter = Router();

salesAdsPublicRouter.get("/", async (req, res, next) => {
  try {
    const lang = ((req.query.lang as string) || "mn") as "mn" | "en";
    const now = new Date();
    const raw = await SalesAd.find({ active: true }).sort({ createdAt: -1 }).lean();
    const ads = raw.filter((a) => {
      const vf = a.validFrom ? new Date(a.validFrom) <= now : true;
      const vt = a.validTo ? new Date(a.validTo) >= now : true;
      return vf && vt;
    });

    const data = ads.map((a) => {
      const base = serializeLean(a as Record<string, unknown>)!;
      const langContent = (a[lang] ?? {}) as Record<string, unknown>;
      return {
        id: base.id,
        title: langContent.title ?? "",
        summary: langContent.summary ?? "",
        body: langContent.body ?? "",
        imageUrl: base.imageUrl,
        externalUrl: base.externalUrl,
        active: base.active,
        validFrom: base.validFrom,
        validTo: base.validTo,
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
