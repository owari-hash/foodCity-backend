import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "bot", "agent"],
      required: true,
    },
    text: { type: String, required: true },
    /** Set when role is agent — admin who sent the reply */
    agentDisplayName: { type: String },
    agentUsername: { type: String },
  },
  { timestamps: true },
);

export type MessageDoc = mongoose.InferSchemaType<typeof MessageSchema>;
export const Message =
  mongoose.models.Message ?? mongoose.model("Message", MessageSchema);
