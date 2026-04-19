import { Router } from "express";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import {
  createOrGetConversation,
  postUserMessage,
} from "../services/chatService.js";
import { serializeLean } from "../util/serialize.js";

export const chatPublicRouter = Router();

chatPublicRouter.post("/conversations", async (req, res, next) => {
  try {
    const { guestId, displayName } = req.body as {
      guestId?: string;
      displayName?: string;
    };
    if (!guestId || typeof guestId !== "string") {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "guestId is required" },
      });
      return;
    }
    const conv = await createOrGetConversation(guestId, displayName);
    res.status(201).json({
      data: serializeLean(conv.toObject() as Record<string, unknown>),
    });
  } catch (e) {
    next(e);
  }
});

chatPublicRouter.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const { id } = req.params;
    const guestId = req.query.guestId as string | undefined;
    if (!guestId) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "guestId query required" },
      });
      return;
    }
    const conv = await Conversation.findById(id).lean();
    if (!conv || conv.guestId !== guestId) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
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

chatPublicRouter.post("/conversations/:id/messages", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, guestId } = req.body as { text?: string; guestId?: string };
    if (!text?.trim() || !guestId) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "text and guestId are required",
        },
      });
      return;
    }
    const result = await postUserMessage(id, guestId, text.trim());
    res.status(201).json({ data: result });
  } catch (e) {
    const err = e as Error;
    if (err.message === "FORBIDDEN") {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Invalid guest" },
      });
      return;
    }
    next(e);
  }
});
