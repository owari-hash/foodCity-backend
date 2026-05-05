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
  
    // Admin who last updated this config
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

export const SMSConfig = mongoose.model("SMSConfig", smsConfigSchema);
