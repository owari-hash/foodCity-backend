import mongoose, { Schema } from "mongoose";

const LangContentSchema = new Schema(
  {
    title: { type: String, default: "" },
    location: { type: String, default: "" },
    description: { type: String, default: "" },
    salary: { type: String, default: "" },
  },
  { _id: false },
);

const JobPostingSchema = new Schema(
  {
    mn: { type: LangContentSchema, default: () => ({}) },
    en: { type: LangContentSchema, default: () => ({}) },
    company: { type: String, required: true },
    contactEmail: { type: String },
    /** Public URL or `/upload/…` from admin upload */
    imageUrl: { type: String },
    active: { type: Boolean, default: true },
    postedByUsername: { type: String },
    postedByDisplayName: { type: String },
    lastEditedByUsername: { type: String },
    lastEditedByDisplayName: { type: String },
  },
  { timestamps: true },
);

export type JobPostingDoc = mongoose.InferSchemaType<typeof JobPostingSchema>;
export const JobPosting =
  mongoose.models.JobPosting ?? mongoose.model("JobPosting", JobPostingSchema);
