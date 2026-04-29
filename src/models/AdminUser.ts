import mongoose, { Schema } from "mongoose";

const AdminUserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    permissions: [{ type: String, required: true }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type AdminUserDoc = mongoose.InferSchemaType<typeof AdminUserSchema>;
export const AdminUser =
  mongoose.models.AdminUser ?? mongoose.model("AdminUser", AdminUserSchema);
