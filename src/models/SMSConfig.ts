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
      sendOnOrderSubmission: {
        type: Boolean,
        default: true,
      },
      sendOnJobApplication: {
        type: Boolean,
        default: false,
      },
    },

    // Message templates
    templates: {
      contactSubmission: {
        type: String,
        default:
          "New collaboration request from {name}. Phone: {phone}, Email: {email}. Check admin panel for details.",
      },
      orderSubmission: {
        type: String,
        default: "New order received from {name}. Order ID: {orderId}. Check admin panel.",
      },
      jobApplication: {
        type: String,
        default: "New job application from {name}. Position: {position}. Check admin panel.",
      },
    },

    // Usage statistics
    stats: {
      totalSent: {
        type: Number,
        default: 0,
      },
      totalFailed: {
        type: Number,
        default: 0,
      },
      lastSentAt: Date,
    },

    // Admin who last updated this config
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

export const SMSConfig = mongoose.model("SMSConfig", smsConfigSchema);
