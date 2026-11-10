import { ChannelResult } from "../types";
import { getAlertMessage } from "../templates";

export async function sendWhatsAppAlert(timestamp: string): Promise<ChannelResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toPhone = process.env.ALERT_RECIPIENT_PHONE;

  if (!token || !phoneNumberId) {
    return {
      channel: "WHATSAPP",
      status: "SKIPPED",
      details: "WhatsApp Cloud API credentials not configured in .env",
      recipient: toPhone || "Not configured",
    };
  }

  if (!toPhone) {
    return {
      channel: "WHATSAPP",
      status: "FAILED",
      error: "ALERT_RECIPIENT_PHONE is not configured in .env",
    };
  }

  try {
    const message = await getAlertMessage("WHATSAPP", timestamp);
    // WhatsApp format requires numbers without '+' or punctuation (e.g. 15551234567)
    const cleanedRecipient = toPhone.replace(/[^0-9]/g, "");

    const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanedRecipient,
      type: "text",
      text: {
        preview_url: false,
        body: message.body,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        channel: "WHATSAPP",
        status: "FAILED",
        error: data.error?.message || `WhatsApp HTTP error ${response.status}`,
        recipient: toPhone,
      };
    }

    const messageId = data.messages?.[0]?.id;

    return {
      channel: "WHATSAPP",
      status: "SENT",
      messageId: messageId,
      recipient: toPhone,
      details: `WhatsApp message dispatched to ${toPhone}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      channel: "WHATSAPP",
      status: "FAILED",
      error: errorMsg,
      recipient: toPhone,
    };
  }
}
