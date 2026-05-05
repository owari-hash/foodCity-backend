/**
 * SMS Service using MessagePro API (messagepro.mn)
 * API credentials are retrieved from environment variables
 */

import { SMSConfig } from "../models/SMSConfig.js";

interface MessageProConfig {
  apiKey: string;
  senderId: string;
}

// MessagePro API credentials from environment
const MESSAGEPRO_CONFIG: MessageProConfig = {
  apiKey: process.env.MESSAGEPRO_API_KEY || "aa8e588459fdd9b7ac0b809fc29cfae3",
  senderId: process.env.MESSAGEPRO_SENDER_ID || "72002002",
};

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Validate phone number format
  if (!phoneNumber || !/^\+?[0-9\s\-()]{7,}$/.test(phoneNumber)) {
    return { success: false, error: "Invalid phone number format" };
  }

  try {
    return await sendViaMessagePro(phoneNumber, message);
  } catch (error) {
    console.error("SMS sending error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaMessagePro(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber.replace(/[\s\-()]/g, "");

  // Build MessagePro API URL
  const url = new URL("https://api.messagepro.mn/send");
  url.searchParams.append("key", MESSAGEPRO_CONFIG.apiKey);
  url.searchParams.append("from", MESSAGEPRO_CONFIG.senderId);
  url.searchParams.append("to", cleanPhone);
  url.searchParams.append("text", message);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        success: false,
        error: `MessagePro API returned ${response.status}`,
      };
    }

    const data = (await response.json()) as Array<{ id?: string; error?: string }>;

    if (data && data[0]) {
      if (data[0].error) {
        return {
          success: false,
          error: data[0].error,
        };
      }
      return {
        success: true,
        messageId: data[0].id || `messagepro_${Date.now()}`,
      };
    }

    return {
      success: true,
      messageId: `messagepro_${Date.now()}`,
    };
  } catch (error) {
    console.error("MessagePro API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "API call failed",
    };
  }
}

/**
 * Send SMS using admin-configured settings for Contact Submission
 */
export async function sendContactSubmissionSMS(
  placeholders: Record<string, string>
): Promise<{ success: boolean; results?: Array<{ phone: string; success: boolean }>; error?: string }> {
  try {
    const config = await SMSConfig.findOne();
    if (!config) {
      return { success: false, error: "SMS configuration not found" };
    }


    // Get template and replace placeholders (defaulting to mn for admin alerts)
    let message = "Bukhbat website's sanal irlee.";
    Object.entries(placeholders).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, "g"), value);
    });

    if (!MESSAGEPRO_CONFIG.apiKey) {
      console.warn("SMS sending skipped: MESSAGEPRO_API_KEY is not set.");
      return { success: false, results: [], error: "SMS credentials not configured" };
    }

    if (!message || !config.adminPhoneNumbers || config.adminPhoneNumbers.length === 0) {
      return { success: true, results: [] };
    }

    // Send to all admin phone numbers
    const results = await Promise.all(
      config.adminPhoneNumbers.map(async (phone) => {
        const result = await sendSMS(phone, message);
        return {
          phone,
          success: result.success,
        };
      })
    );

    return { success: results.some(r => r.success), results };
  } catch (error) {
    console.error("Error sending admin SMS notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}
