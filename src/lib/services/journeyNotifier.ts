export async function sendJourneyTelegramAlert(messageHtml: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Journey Notifier] Telegram credentials not configured.");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("[Journey Notifier Error]:", err);
    return false;
  }
}
