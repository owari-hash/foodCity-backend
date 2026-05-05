import express, { Request, Response } from "express";
import { SMSConfig } from "../models/SMSConfig.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import { requirePermission } from "../middleware/adminRbac.js";
import { sendSMS } from "../services/smsService.js";

export const smsConfigAdminRouter = express.Router();

// Apply admin authentication to all routes
smsConfigAdminRouter.use(requireAdminAuth);

/**
 * GET /api/v1/admin/sms-config
 * Get current SMS configuration
 */
smsConfigAdminRouter.get("/", requirePermission("site-content"), async (req: Request, res: Response) => {
  try {
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
 * Update SMS configuration
 */
smsConfigAdminRouter.put("/", requirePermission("site-content"), async (req: Request, res: Response) => {
  try {
    const {
      adminPhoneNumbers,
    } = req.body;

    let config = await SMSConfig.findOne();

    if (!config) {
      config = new SMSConfig();
    }

    // Update fields
    if (adminPhoneNumbers !== undefined) {
      config.adminPhoneNumbers = adminPhoneNumbers;
      config.markModified("adminPhoneNumbers");
    }

    config.updatedBy = req.admin?.displayName || req.body.updatedBy || "admin";

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
smsConfigAdminRouter.post("/test", requirePermission("site-content"), async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Send test SMS using the service (which uses environment variables)
    const testMessage = `Test SMS from FoodCity Admin. Time: ${new Date().toLocaleString()}`;
    const result = await sendSMS(phoneNumber, testMessage);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: "Test SMS sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return res.status(500).json({ error: "Failed to send test SMS" });
  }
});
