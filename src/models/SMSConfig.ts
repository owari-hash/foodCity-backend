import mongoose from "mongoose";

const smsConfigSchema = new mongoose.Schema(
  {
    // Admin phone numbers to receive notifications
    adminPhoneNumbers: {
      type: [String],
      default: [],
    },

  
    // Admin who last updated this config
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

export const SMSConfig = mongoose.model("SMSConfig", smsConfigSchema);
