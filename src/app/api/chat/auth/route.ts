import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: "User selection and security code are required." },
        { status: 400 }
      );
    }

    const user = await prisma.chatUser.findUnique({
      where: { userId: String(userId) },
    });

    if (!user || user.code !== String(code).trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid security code for selected user." },
        { status: 401 }
      );
    }

    // Fire Telegram Notification: "[User Name] is online"
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const timestamp = new Date().toLocaleTimeString();
      const message = `🔔 <b>Chat Presence Update</b>\n\n<b>${user.name}</b> is now online in the Emergency Chat room.\n<i>Time: ${timestamp}</i>`;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }).catch((err) => {
        console.warn("[Telegram Presence Notice Error]:", err);
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Chat Auth Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
