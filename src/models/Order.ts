import mongoose, { Schema } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "delivered", "cancelled"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true },
);

export type OrderDoc = mongoose.InferSchemaType<typeof OrderSchema>;
export const Order =
  mongoose.models.Order ?? mongoose.model("Order", OrderSchema);
