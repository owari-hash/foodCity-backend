import express, { Request, Response } from "express";
import { SMSConfig } from "../models/SMSConfig.js";

export const smsConfigAdminRouter = express.Router();

/**
 * GET /api/v1/admin/sms-config
 * Get current SMS configuration
 */
smsConfigAdminRouter.get("/", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    let config = await SMSConfig.findOne();

    // Create default config if it doesn't exist
    if (!config) {
      config = new SMSConfig();
      await config.save();
    }

    return res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error fetching SMS config:", error);
    return res.status(500).json({ error: "Failed to fetch SMS configuration" });
  }
});

/**
 * PUT /api/v1/admin/sms-config
 * Update SMS configuration (admin phone numbers, notification settings, templates)
 */
smsConfigAdminRouter.put("/", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    const {
      adminPhoneNumbers,
      notificationSettings,
      templates,
    } = req.body;

    let config = await SMSConfig.findOne();

    if (!config) {
      config = new SMSConfig();
    }

    // Update fields
    if (adminPhoneNumbers !== undefined)
      config.adminPhoneNumbers = adminPhoneNumbers;
    if (notificationSettings !== undefined)
      config.notificationSettings = notificationSettings;
    if (templates !== undefined) config.templates = templates;

    config.updatedBy = req.body.updatedBy || "admin";

    await config.save();

    return res.json({
      success: true,
      message: "SMS configuration updated successfully",
      config,
    });
  } catch (error) {
    console.error("Error updating SMS config:", error);
    return res.status(500).json({ error: "Failed to update SMS configuration" });
  }
});

/**
 * POST /api/v1/admin/sms-config/test
 * Send a test SMS to verify configuration
 */
smsConfigAdminRouter.post("/test", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Send test SMS using hardcoded credentials
    const testMessage = `Test SMS from FoodCity Admin. Time: ${new Date().toISOString()}`;

    const url = new URL("https://api.messagepro.mn/send");
    url.searchParams.append("key", "aa8e588459fdd9b7ac0b809fc29cfae3");
    url.searchParams.append("from", "72002002");
    url.searchParams.append("to", phoneNumber.replace(/[\s\-()]/g, ""));
    url.searchParams.append("text", testMessage);

    const response = await fetch(url.toString());
    const data = (await response.json()) as Array<{ id?: string; error?: string }>;

    if (data && data[0] && data[0].error) {
      return res.status(400).json({
        success: false,
        error: data[0].error,
      });
    }

    return res.json({
      success: true,
      message: "Test SMS sent successfully",
      messageId: data?.[0]?.id,
    });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return res.status(500).json({ error: "Failed to send test SMS" });
  }
});

/**
 * GET /api/v1/admin/sms-config/stats
 * Get SMS usage statistics
 */
smsConfigAdminRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    const config = await SMSConfig.findOne();

    if (!config) {
      return res.json({
        success: true,
        stats: {
          totalSent: 0,
          totalFailed: 0,
          lastSentAt: null,
        },
      });
    }

    return res.json({
      success: true,
      stats: config.stats,
    });
  } catch (error) {
    console.error("Error fetching SMS stats:", error);
    return res.status(500).json({ error: "Failed to fetch SMS statistics" });
  }
});
