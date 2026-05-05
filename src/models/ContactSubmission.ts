import mongoose from "mongoose";

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: false,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "read", "responded"],
      default: "new",
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

export const ContactSubmission = mongoose.model(
  "ContactSubmission",
  contactSubmissionSchema
);
