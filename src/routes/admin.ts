import { Router, type Request } from "express";
import mongoose from "mongoose";
import { upload } from "../uploadConfig.js";
import { Conversation } from "../models/Conversation.js";
import { JobPosting } from "../models/JobPosting.js";
import { Message } from "../models/Message.js";
import { Order } from "../models/Order.js";
import { SalesAd } from "../models/SalesAd.js";
import { SitePage } from "../models/SitePage.js";
import { postAgentMessage } from "../services/chatService.js";
import { serializeDocument, serializeLean } from "../util/serialize.js";
import { adminLoginHandler, requireAdminAuth } from "../middleware/adminAuth.js";

export const adminRouter = Router();

adminRouter.post("/auth/login", adminLoginHandler);
adminRouter.use(requireAdminAuth);

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [
      ordersToday,
      revenueAgg,
      pendingOrders,
      activeAds,
      activeJobs,
      totalOrders,
      openConversations,
      humanModeChats,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: start } }),
      Order.aggregate<{ total: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments({ status: "pending" }),
      SalesAd.countDocuments({ active: true }),
      JobPosting.countDocuments({ active: true }),
      Order.countDocuments(),
      Conversation.countDocuments({ status: "open" }),
      Conversation.countDocuments({ humanMode: true, status: "open" }),
    ]);
    const revenueToday = revenueAgg[0]?.total ?? 0;
    res.json({
      data: {
        ordersToday,
        revenueToday,
        pendingOrders,
        activeSalesAds: activeAds,
        activeJobs: activeJobs,
        totalOrders,
        openConversations,
        humanModeChats,
      },
    });
  } catch (e) {
    next(e);
  }
});

/* ——— Orders ——— */
adminRouter.get("/orders", async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      data: orders.map((o) => serializeLean(o as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body as { status?: string; notes?: string };
    const order = await Order.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(notes !== undefined && { notes }) },
      { new: true },
    );
    if (!order) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Order" } });
      return;
    }
    res.json({ data: serializeDocument(order) });
  } catch (e) {
    next(e);
  }
});

/* ——— Sales ads ——— */
adminRouter.get("/sales-ads", async (_req, res, next) => {
  try {
    const ads = await SalesAd.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      data: ads.map((a) => serializeLean(a as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/sales-ads", async (req, res, next) => {
  try {
    const ad = await SalesAd.create(req.body);
    res.status(201).json({ data: serializeDocument(ad) });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/sales-ads/:id", async (req, res, next) => {
  try {
    const ad = await SalesAd.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!ad) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "SalesAd" } });
      return;
    }
    res.json({ data: serializeDocument(ad) });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/sales-ads/:id", async (req, res, next) => {
  try {
    const r = await SalesAd.findByIdAndDelete(req.params.id);
    if (!r) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "SalesAd" } });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

/* ——— Jobs ——— */
adminRouter.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await JobPosting.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      data: jobs.map((j) => serializeLean(j as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/jobs", async (req, res, next) => {
  try {
    const job = await JobPosting.create(req.body);
    res.status(201).json({ data: serializeDocument(job) });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/jobs/:id", async (req, res, next) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job" } });
      return;
    }
    res.json({ data: serializeDocument(job) });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/jobs/:id", async (req, res, next) => {
  try {
    const r = await JobPosting.findByIdAndDelete(req.params.id);
    if (!r) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job" } });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

/* ——— Chat (admin) ——— */
adminRouter.get("/conversations", async (_req, res, next) => {
  try {
    const list = await Conversation.find().sort({ updatedAt: -1 }).limit(200).lean();
    res.json({
      data: list.map((c) => serializeLean(c as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: { code: "INVALID_ID", message: "Bad id" } });
      return;
    }
    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      data: messages.map((m) => serializeLean(m as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/conversations/:id", async (req, res, next) => {
  try {
    const { humanMode, status, displayName } = req.body as {
      humanMode?: boolean;
      status?: string;
      displayName?: string;
    };
    const conv = await Conversation.findByIdAndUpdate(
      req.params.id,
      {
        ...(humanMode !== undefined && { humanMode }),
        ...(status && { status }),
        ...(displayName !== undefined && { displayName }),
      },
      { new: true },
    );
    if (!conv) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Chat" } });
      return;
    }
    res.json({ data: serializeDocument(conv) });
  } catch (e) {
    next(e);
  }
});

type UploadRequest = Request & { file?: Express.Multer.File };

/** POST multipart/form-data, field name: `file` — saves under /upload on API host */
adminRouter.post("/upload", upload.single("file"), (req: UploadRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "file field required" },
      });
      return;
    }
    const publicPath = `/upload/${req.file.filename}`;
    res.status(201).json({
      data: { path: publicPath },
    });
  } catch (e) {
    next(e);
  }
});

/* ——— Site pages (marketing content) ——— */
adminRouter.get("/site-pages", async (_req, res, next) => {
  try {
    const list = await SitePage.find().sort({ pageId: 1 }).lean();
    res.json({
      data: list.map((p) => serializeLean(p as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/site-pages/:pageId", async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const doc = await SitePage.findOne({ pageId }).lean();
    if (!doc) {
      res.json({ data: { pageId, sections: {}, id: null } });
      return;
    }
    res.json({ data: serializeLean(doc as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
});

adminRouter.put("/site-pages/:pageId", async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { sections } = req.body as { sections?: unknown };
    if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "sections object required" },
      });
      return;
    }
    const doc = await SitePage.findOneAndUpdate(
      { pageId },
      { pageId, sections },
      { new: true, upsert: true, runValidators: true },
    );
    res.json({ data: serializeDocument(doc!) });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/conversations/:id/messages", async (req, res, next) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "text required" },
      });
      return;
    }
    const msg = await postAgentMessage(req.params.id, text.trim());
    res.status(201).json({ data: msg });
  } catch (e) {
    const err = e as Error;
    if (err.message === "NOT_FOUND") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Chat" } });
      return;
    }
    next(e);
  }
});
