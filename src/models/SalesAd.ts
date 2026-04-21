import mongoose, { Schema } from "mongoose";

const LangContentSchema = new Schema(
  {
    title: { type: String, default: "" },
    summary: { type: String, default: "" },
    body: { type: String, default: "" },
  },
  { _id: false },
);

const SalesAdSchema = new Schema(
  {
    mn: { type: LangContentSchema, default: () => ({}) },
    en: { type: LangContentSchema, default: () => ({}) },
    imageUrl: { type: String },
    externalUrl: { type: String },
    active: { type: Boolean, default: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    postedByUsername: { type: String },
    postedByDisplayName: { type: String },
    lastEditedByUsername: { type: String },
    lastEditedByDisplayName: { type: String },
  },
  { timestamps: true },
);

export type SalesAdDoc = mongoose.InferSchemaType<typeof SalesAdSchema>;
export const SalesAd =
  mongoose.models.SalesAd ?? mongoose.model("SalesAd", SalesAdSchema);
