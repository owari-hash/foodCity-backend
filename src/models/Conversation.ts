import mongoose, { Schema } from "mongoose";

const ConversationSchema = new Schema(
  {
    guestId: { type: String, required: true, index: true },
    displayName: { type: String },
    humanMode: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true },
);

export type ConversationDoc = mongoose.InferSchemaType<typeof ConversationSchema>;
export const Conversation =
  mongoose.models.Conversation ??
  mongoose.model("Conversation", ConversationSchema);
