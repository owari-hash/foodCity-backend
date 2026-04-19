import { Router } from "express";
import { Order } from "../models/Order.js";
import { serializeDocument } from "../util/serialize.js";

export const ordersPublicRouter = Router();

ordersPublicRouter.post("/", async (req, res, next) => {
  try {
    const { customerName, phone, email, address, items, notes } = req.body as {
      customerName?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      items?: { productName: string; quantity: number; unitPrice: number }[];
    };
    if (!customerName || !phone) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "customerName and phone are required",
        },
      });
      return;
    }
    const normalizedItems = Array.isArray(items) ? items : [];
    const totalAmount = normalizedItems.reduce(
      (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice),
      0,
    );
    const order = await Order.create({
      customerName,
      phone,
      email,
      address,
      items: normalizedItems,
      totalAmount,
      notes,
    });
    res.status(201).json({ data: serializeDocument(order) });
  } catch (e) {
    next(e);
  }
});
