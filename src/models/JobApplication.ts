import mongoose, { Schema } from "mongoose";

const JobApplicationSchema = new Schema(
  {
    jobId: { type: String, required: true },
    jobTitle: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    cvUrl: { type: String, required: true },
    message: { type: String },
    status: { type: String, enum: ["new", "reviewed", "rejected"], default: "new" },
  },
  { timestamps: true },
);

export type JobApplicationDoc = mongoose.InferSchemaType<typeof JobApplicationSchema>;
export const JobApplication =
  mongoose.models.JobApplication ?? mongoose.model("JobApplication", JobApplicationSchema);
