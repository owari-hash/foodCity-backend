import mongoose, { Schema } from "mongoose";

const SalesAdSchema = new Schema(
  {
    title: { type: String, required: true },
    summary: { type: String },
    body: { type: String, required: true },
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
