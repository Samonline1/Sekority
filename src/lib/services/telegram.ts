import { ChannelResult } from "../types";
import { getAlertMessage } from "../templates";

export async function sendTelegramAlert(timestamp: string): Promise<ChannelResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || botToken.trim() === "") {
    return {
      channel: "TELEGRAM",
      status: "SKIPPED",
      details: "TELEGRAM_BOT_TOKEN not configured in .env",
    };
  }

  if (!chatId || chatId.trim() === "") {
    return {
      channel: "TELEGRAM",
      status: "SKIPPED",
      details: "TELEGRAM_CHAT_ID not configured. Send /start to the bot first.",
    };
  }

  try {
    const templateMessage = await getAlertMessage("SMS", timestamp); // Uses concise urgent mobile template
    const text = `🚨 <b>EMERGENCY SECURITY ALERT</b> 🚨\n\n${templateMessage.body}\n\n<b>Source:</b> Accessible Web Security Client\n<b>Triggered At:</b> ${timestamp}`;

    const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        channel: "TELEGRAM",
        status: "FAILED",
        error: data.description || `Telegram API error ${response.status}`,
        recipient: `Chat: ${chatId}`,
      };
    }

    return {
      channel: "TELEGRAM",
      status: "SENT",
      messageId: String(data.result?.message_id),
      recipient: `Telegram User (Chat ID: ${chatId})`,
      details: `Instantly delivered to @seko_emergency_bot`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      channel: "TELEGRAM",
      status: "FAILED",
      error: errorMsg,
      recipient: `Chat: ${chatId}`,
    };
  }
}
