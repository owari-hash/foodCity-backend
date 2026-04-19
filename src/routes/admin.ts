import { Router, type Request } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { upload } from "../uploadConfig.js";
import { Conversation } from "../models/Conversation.js";
import { JobPosting } from "../models/JobPosting.js";
import { Message } from "../models/Message.js";
import { Order } from "../models/Order.js";
import { SalesAd } from "../models/SalesAd.js";
import { SitePage } from "../models/SitePage.js";
import { AdminUser } from "../models/AdminUser.js";
import { postAgentMessage } from "../services/chatService.js";
import { serializeDocument, serializeLean } from "../util/serialize.js";
import { invalidateChatbotSiteCache } from "../services/chatbotFromSite.js";
import { adminLoginHandler, requireAdminAuth } from "../middleware/adminAuth.js";
import { requirePermission } from "../middleware/adminRbac.js";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions.js";

function paramString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export const adminRouter = Router();

adminRouter.post("/auth/login", adminLoginHandler);
adminRouter.use(requireAdminAuth);

const SALES_AUTHOR_KEYS = [
  "postedByUsername",
  "postedByDisplayName",
  "lastEditedByUsername",
  "lastEditedByDisplayName",
] as const;

function stripSalesAdBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const k of SALES_AUTHOR_KEYS) delete out[k];
  return out;
}

function stripJobBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const k of SALES_AUTHOR_KEYS) delete out[k];
  return out;
}

function isValidPermissionList(perms: unknown): perms is string[] {
  if (!Array.isArray(perms)) return false;
  const allowed = new Set<string>([...ADMIN_PERMISSIONS, "*"]);
  return perms.every((x) => typeof x === "string" && allowed.has(x));
}

adminRouter.get("/stats", requirePermission("dashboard"), async (req, res, next) => {
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
      Order.countDocuments({ createdAt: { $gte: start } }).catch(() => 0),
      Order.aggregate<{ total: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]).catch(() => []),
      Order.countDocuments({ status: "pending" }).catch(() => 0),
      SalesAd.countDocuments({ active: true }).catch(() => 0),
      JobPosting.countDocuments({ active: true }).catch(() => 0),
      Order.countDocuments().catch(() => 0),
      Conversation.countDocuments({ status: "open" }).catch(() => 0),
      Conversation.countDocuments({ humanMode: true, status: "open" }).catch(() => 0),
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
adminRouter.get("/orders", requirePermission("orders"), async (req, res, next) => {
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

adminRouter.patch("/orders/:id", requirePermission("orders"), async (req, res, next) => {
  try {
    const id = paramString(req.params.id);
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
adminRouter.get("/sales-ads", requirePermission("sales-ads"), async (_req, res, next) => {
  try {
    const ads = await SalesAd.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      data: ads.map((a) => serializeLean(a as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/sales-ads", requirePermission("sales-ads"), async (req, res, next) => {
  try {
    const a = req.admin!;
    const ad = await SalesAd.create({
      ...stripSalesAdBody(req.body as Record<string, unknown>),
      postedByUsername: a.username,
      postedByDisplayName: a.displayName,
    });
    res.status(201).json({ data: serializeDocument(ad) });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/sales-ads/:id", requirePermission("sales-ads"), async (req, res, next) => {
  try {
    const a = req.admin!;
    const ad = await SalesAd.findByIdAndUpdate(
      paramString(req.params.id),
      {
        ...stripSalesAdBody(req.body as Record<string, unknown>),
        lastEditedByUsername: a.username,
        lastEditedByDisplayName: a.displayName,
      },
      { new: true },
    );
    if (!ad) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "SalesAd" } });
      return;
    }
    res.json({ data: serializeDocument(ad) });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/sales-ads/:id", requirePermission("sales-ads"), async (req, res, next) => {
  try {
    const r = await SalesAd.findByIdAndDelete(paramString(req.params.id));
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
adminRouter.get("/jobs", requirePermission("jobs"), async (_req, res, next) => {
  try {
    const jobs = await JobPosting.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      data: jobs.map((j) => serializeLean(j as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/jobs", requirePermission("jobs"), async (req, res, next) => {
  try {
    const a = req.admin!;
    const job = await JobPosting.create({
      ...stripJobBody(req.body as Record<string, unknown>),
      postedByUsername: a.username,
      postedByDisplayName: a.displayName,
    });
    res.status(201).json({ data: serializeDocument(job) });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/jobs/:id", requirePermission("jobs"), async (req, res, next) => {
  try {
    const a = req.admin!;
    const job = await JobPosting.findByIdAndUpdate(
      paramString(req.params.id),
      {
        ...stripJobBody(req.body as Record<string, unknown>),
        lastEditedByUsername: a.username,
        lastEditedByDisplayName: a.displayName,
      },
      { new: true },
    );
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job" } });
      return;
    }
    res.json({ data: serializeDocument(job) });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/jobs/:id", requirePermission("jobs"), async (req, res, next) => {
  try {
    const r = await JobPosting.findByIdAndDelete(paramString(req.params.id));
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
adminRouter.get("/conversations", requirePermission("chat"), async (_req, res, next) => {
  try {
    const list = await Conversation.find().sort({ updatedAt: -1 }).limit(200).lean();
    res.json({
      data: list.map((c) => serializeLean(c as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/conversations/:id/messages", requirePermission("chat"), async (req, res, next) => {
  try {
    const id = paramString(req.params.id);
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

adminRouter.patch("/conversations/:id", requirePermission("chat"), async (req, res, next) => {
  try {
    const { humanMode, status, displayName } = req.body as {
      humanMode?: boolean;
      status?: string;
      displayName?: string;
    };
    const conv = await Conversation.findByIdAndUpdate(
      paramString(req.params.id),
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
adminRouter.post(
  "/upload",
  requirePermission("upload"),
  upload.single("file"),
  (req: UploadRequest, res, next) => {
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
  },
);

/* ——— Site pages (marketing content) ——— */
adminRouter.get("/site-pages", requirePermission("site-content"), async (_req, res, next) => {
  try {
    const list = await SitePage.find().sort({ pageId: 1 }).lean();
    res.json({
      data: list.map((p) => serializeLean(p as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/site-pages/:pageId", requirePermission("site-content"), async (req, res, next) => {
  try {
    const pageId = paramString(req.params.pageId);
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

adminRouter.put("/site-pages/:pageId", requirePermission("site-content"), async (req, res, next) => {
  try {
    const pageId = paramString(req.params.pageId);
    const { sections } = req.body as { sections?: unknown };
    if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "sections object required" },
      });
      return;
    }
    const a = req.admin!;
    const doc = await SitePage.findOneAndUpdate(
      { pageId },
      {
        pageId,
        sections,
        lastEditedByUsername: a.username,
        lastEditedByDisplayName: a.displayName,
      },
      { new: true, upsert: true, runValidators: true },
    );
    if (pageId === "chatbot") {
      invalidateChatbotSiteCache();
    }
    res.json({ data: serializeDocument(doc!) });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/conversations/:id/messages", requirePermission("chat"), async (req, res, next) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "text required" },
      });
      return;
    }
    const a = req.admin!;
    const msg = await postAgentMessage(paramString(req.params.id), text.trim(), {
      displayName: a.displayName,
      username: a.username,
    });
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

/* ——— Admin users (RBAC) ——— */
adminRouter.get("/admin-users", requirePermission("admin-users"), async (_req, res, next) => {
  try {
    const users = await AdminUser.find().select("-passwordHash").sort({ username: 1 }).lean();
    res.json({
      data: users.map((u) => serializeLean(u as Record<string, unknown>)),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/admin-users", requirePermission("admin-users"), async (req, res, next) => {
  try {
    const { username, password, displayName, permissions } = req.body as {
      username?: string;
      password?: string;
      displayName?: string;
      permissions?: unknown;
    };
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      typeof displayName !== "string" ||
      !isValidPermissionList(permissions) ||
      permissions.length === 0
    ) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "username, password, displayName, permissions[] required",
        },
      });
      return;
    }
    const u = username.trim().toLowerCase();
    if (u.length < 2 || password.length < 6) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid username or password length" },
      });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await AdminUser.create({
      username: u,
      passwordHash,
      displayName: displayName.trim(),
      permissions,
      active: true,
    });
    const safe = await AdminUser.findById(created._id).select("-passwordHash").lean();
    res.status(201).json({ data: serializeLean(safe as Record<string, unknown>) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      res.status(409).json({
        error: { code: "DUPLICATE", message: "Username already exists" },
      });
      return;
    }
    next(e);
  }
});

adminRouter.patch("/admin-users/:id", requirePermission("admin-users"), async (req, res, next) => {
  try {
    const id = paramString(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: { code: "INVALID_ID", message: "Bad id" } });
      return;
    }
    const { displayName, permissions, active, password } = req.body as {
      displayName?: string;
      permissions?: unknown;
      active?: boolean;
      password?: string;
    };
    const update: Record<string, unknown> = {};
    if (displayName !== undefined) {
      if (typeof displayName !== "string" || !displayName.trim()) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "displayName invalid" } });
        return;
      }
      update.displayName = displayName.trim();
    }
    if (permissions !== undefined) {
      if (!isValidPermissionList(permissions) || permissions.length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "permissions invalid" } });
        return;
      }
      update.permissions = permissions;
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "active must be boolean" } });
        return;
      }
      update.active = active;
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "password invalid" } });
        return;
      }
      update.passwordHash = await bcrypt.hash(password, 10);
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
      return;
    }
    const updated = await AdminUser.findByIdAndUpdate(id, update, { new: true })
      .select("-passwordHash")
      .lean();
    if (!updated) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "AdminUser" } });
      return;
    }
    res.json({ data: serializeLean(updated as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
});
