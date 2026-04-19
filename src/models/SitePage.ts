import mongoose, { Schema } from "mongoose";

const SitePageSchema = new Schema(
  {
    pageId: { type: String, required: true, unique: true, index: true },
    sections: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type SitePageDoc = mongoose.InferSchemaType<typeof SitePageSchema>;
export const SitePage =
  mongoose.models.SitePage ?? mongoose.model("SitePage", SitePageSchema);
