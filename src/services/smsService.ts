/**
 * SMS Service using MessagePro API (messagepro.mn)
 * API credentials are hardcoded
 * Admin can configure recipient phone numbers via admin panel
 */

interface MessageProConfig {
  apiKey: string;
  senderId: string;
}

// Hardcoded MessagePro API credentials
const MESSAGEPRO_CONFIG: MessageProConfig = {
  apiKey: "aa8e588459fdd9b7ac0b809fc29cfae3",
  senderId: "72002002",
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

export async function sendCollaborationRequestSMS(
  submitterName: string,
  submitterPhone: string,
  submitterEmail: string,
  adminPhoneNumbers: string[]
): Promise<{ success: boolean; results: Array<{ phone: string; success: boolean; messageId?: string }> }> {
  const message = `New collaboration request from ${submitterName}. Phone: ${submitterPhone}, Email: ${submitterEmail}. Check admin panel for details.`;

  const results = await Promise.all(
    adminPhoneNumbers.map(async (phone) => {
      const result = await sendSMS(phone, message);
      return {
        phone,
        success: result.success,
        messageId: result.messageId,
      };
    })
  );

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

/**
 * Send SMS using admin-configured settings
 * This function retrieves SMS configuration from the database
 */
export async function sendSMSWithAdminConfig(
  phoneNumber: string,
  message: string,
  adminConfigId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Fetch admin SMS config from database if adminConfigId is provided
  // For now, use environment variables
  return sendSMS(phoneNumber, message);
}
