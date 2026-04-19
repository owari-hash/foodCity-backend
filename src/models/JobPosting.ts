import mongoose, { Schema } from "mongoose";

const JobPostingSchema = new Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    salary: { type: String },
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
