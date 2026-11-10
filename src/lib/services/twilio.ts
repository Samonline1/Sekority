import { ChannelResult } from "../types";
import { getAlertMessage } from "../templates";

export async function sendSmsAlert(timestamp: string): Promise<ChannelResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const toPhone = process.env.ALERT_RECIPIENT_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    return {
      channel: "SMS",
      status: "SKIPPED",
      details: "Twilio credentials (SID, token, or sender phone) not set in .env",
      recipient: toPhone || "Not configured",
    };
  }

  if (!toPhone) {
    return {
      channel: "SMS",
      status: "FAILED",
      error: "ALERT_RECIPIENT_PHONE is not configured in .env",
    };
  }

  try {
    const message = await getAlertMessage("SMS", timestamp);
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", toPhone);
    formData.append("From", fromPhone);
    formData.append("Body", message.body);

    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        channel: "SMS",
        status: "FAILED",
        error: data.message || `Twilio HTTP error ${response.status}`,
        recipient: toPhone,
      };
    }

    return {
      channel: "SMS",
      status: "SENT",
      messageId: data.sid,
      recipient: toPhone,
      details: `SMS queued/sent to ${toPhone}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      channel: "SMS",
      status: "FAILED",
      error: errorMsg,
      recipient: toPhone,
    };
  }
}
