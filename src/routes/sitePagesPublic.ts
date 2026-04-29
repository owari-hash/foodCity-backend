import { Router } from "express";
import { SitePage } from "../models/SitePage.js";
import { serializeLean } from "../util/serialize.js";

export const sitePagesPublicRouter = Router();

sitePagesPublicRouter.get("/drop-index", async (req, res) => {
  try {
    await SitePage.collection.dropIndex("pageId_1");
    res.send("Dropped index pageId_1");
  } catch (e: any) {
    res.send("Could not drop pageId_1 index: " + e.message);
  }
});

sitePagesPublicRouter.get("/:pageId", async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const lang = (req.query.lang as string) || "mn";
    if (!pageId || pageId.length > 64) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "pageId" } });
      return;
    }
    const doc = await SitePage.findOne({ pageId, language: lang }).lean();
    if (!doc) {
      res.json({
        data: { pageId, language: lang, sections: {}, updatedAt: null },
      });
      return;
    }
    res.json({
      data: serializeLean(doc as Record<string, unknown>),
    });
  } catch (e) {
    next(e);
  }
});
