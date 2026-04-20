import mongoose, { Schema } from "mongoose";

const SitePageSchema = new Schema(
  {
    pageId: { type: String, required: true, index: true },
    language: { type: String, required: true, default: "mn", enum: ["mn", "en"] },
    sections: { type: Schema.Types.Mixed, default: {} },
    lastEditedByUsername: { type: String },
    lastEditedByDisplayName: { type: String },
  },
  { timestamps: true },
);

SitePageSchema.index({ pageId: 1, language: 1 }, { unique: true });

export type SitePageDoc = mongoose.InferSchemaType<typeof SitePageSchema>;
export const SitePage =
  mongoose.models.SitePage ?? mongoose.model("SitePage", SitePageSchema);
