import mongoose from "mongoose";

const smsConfigSchema = new mongoose.Schema(
  {
    // Admin phone numbers to receive notifications
    adminPhoneNumbers: {
      type: [String],
      default: [],
    },

    // SMS notification settings
    notificationSettings: {
      sendOnContactSubmission: {
        type: Boolean,
        default: true,
      },
    },

    // Message templates
    templates: {
      contactSubmission: {
        type: String,
        default:
          "New collaboration request from {name}. Phone: {phone}, Email: {email}. Check admin panel for details.",
      },
    },

    // Admin who last updated this config
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

export const SMSConfig = mongoose.model("SMSConfig", smsConfigSchema);
