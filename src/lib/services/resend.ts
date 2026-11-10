import { ChannelResult } from "../types";
import { getAlertMessage } from "../templates";

export async function sendEmailAlert(timestamp: string): Promise<ChannelResult> {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const rawRecipient = (process.env.ALERT_RECIPIENT_EMAIL || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev").trim();

  if (!apiKey) {
    return {
      channel: "EMAIL",
      status: "SKIPPED",
      details: "RESEND_API_KEY not configured in .env",
      recipient: rawRecipient || "Not configured",
    };
  }

  if (!rawRecipient || rawRecipient === "test-emergency@example.com") {
    return {
      channel: "EMAIL",
      status: "FAILED",
      error: "ALERT_RECIPIENT_EMAIL is missing or still set to the default placeholder in .env.local",
    };
  }

  try {
    const message = await getAlertMessage("EMAIL", timestamp);
    const subject = message.subject || "🚨 URGENT: Accessible Security Alert Triggered";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [rawRecipient],
        subject: subject,
        html: message.body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Resend API Error Response]:", data);
      return {
        channel: "EMAIL",
        status: "FAILED",
        error: data.message || `Resend HTTP error ${response.status}`,
        recipient: rawRecipient,
      };
    }

    return {
      channel: "EMAIL",
      status: "SENT",
      messageId: data.id,
      recipient: rawRecipient,
      details: `Delivered to ${rawRecipient}`,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Resend Exception]:", errorMessage);
    return {
      channel: "EMAIL",
      status: "FAILED",
      error: errorMessage,
      recipient: rawRecipient,
    };
  }
}
