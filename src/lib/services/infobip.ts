import { ChannelResult } from "../types";
import { getAlertMessage } from "../templates";

export async function sendVoiceCallAlert(timestamp: string): Promise<ChannelResult> {
  const apiKey = (process.env.INFOBIP_API_KEY || "").trim();
  let baseUrl = (process.env.INFOBIP_BASE_URL || "").trim();
  const rawRecipient = (
    process.env.ALERT_CALL_RECIPIENT_PHONE ||
    process.env.ALERT_RECIPIENT_PHONE ||
    ""
  ).trim();
  const from = (process.env.INFOBIP_FROM_NUMBER || "Emergency").trim();

  if (!apiKey || !baseUrl) {
    return {
      channel: "CALL",
      status: "SKIPPED",
      details: "INFOBIP_API_KEY or INFOBIP_BASE_URL not configured in .env",
      recipient: rawRecipient || "Not configured",
    };
  }

  if (!rawRecipient || rawRecipient === "+10000000000") {
    return {
      channel: "CALL",
      status: "FAILED",
      error: "Emergency call recipient phone number not configured in .env",
    };
  }

  // Ensure baseUrl starts with https:// and has no trailing slash
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Format recipient number (digits only for international E.164 without leading +)
  const cleanedRecipient = rawRecipient.replace(/[^0-9]/g, "");

  try {
    const message = await getAlertMessage("CALL", timestamp);
    const speechText = message.body;

    const endpoint = `${baseUrl}/tts/3/advanced`;

    const payload = {
      messages: [
        {
          from: from,
          destinations: [
            {
              to: cleanedRecipient,
            },
          ],
          text: speechText,
          language: "en",
          voice: {
            name: "Joanna",
            gender: "female",
          },
          speechRate: 0.95,
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Infobip Voice Error Response]:", data);
      const errMsg =
        data.requestError?.serviceException?.text ||
        data.message ||
        `Infobip HTTP error ${response.status}`;
      return {
        channel: "CALL",
        status: "FAILED",
        error: errMsg,
        recipient: rawRecipient,
      };
    }

    const messageId =
      data.messages?.[0]?.messageId ||
      data.bulkId ||
      `infobip_${Date.now()}`;

    return {
      channel: "CALL",
      status: "SENT",
      messageId: messageId,
      recipient: rawRecipient,
      details: `Voice call placed to ${rawRecipient}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Infobip Call Exception]:", errorMsg);
    return {
      channel: "CALL",
      status: "FAILED",
      error: errorMsg,
      recipient: rawRecipient,
    };
  }
}
