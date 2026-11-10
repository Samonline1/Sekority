import { NextRequest, NextResponse } from "next/server";
import { securityAlertSchema, SecurityAlertResponse, ChannelResult } from "@/lib/types";
import { sendEmailAlert } from "@/lib/services/resend";
import { sendSmsAlert } from "@/lib/services/twilio";
import { sendWhatsAppAlert } from "@/lib/services/whatsapp";
import { sendTelegramAlert } from "@/lib/services/telegram";
import { sendVoiceCallAlert } from "@/lib/services/infobip";
import { prisma } from "@/lib/db";

// In-memory rate limiting to prevent spam / rapid duplicate button taps
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 5000; // 5-second cooldown per client

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
    const userAgent = req.headers.get("user-agent") || "unknown-agent";

    // 1. Anti-Duplicate / Rate-Limit Check
    const lastRequestTime = recentSubmissions.get(ip) || 0;
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequestTime)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate alert prevented. Please wait ${waitSeconds}s before re-triggering.`,
        },
        { status: 429 }
      );
    }
    recentSubmissions.set(ip, now);

    // 2. Request Validation
    const body = await req.json().catch(() => ({}));
    const parseResult = securityAlertSchema.safeParse(body);
    const validData = parseResult.success
      ? parseResult.data
      : { clientTimestamp: new Date().toISOString() };

    const timestamp = validData.clientTimestamp || new Date().toISOString();
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 3. Parallel Non-Blocking Execution with Promise.allSettled
    const [emailResult, callResult, telegramResult, smsResult, whatsappResult] = await Promise.allSettled([
      sendEmailAlert(timestamp),
      sendVoiceCallAlert(timestamp),
      sendTelegramAlert(timestamp),
      sendSmsAlert(timestamp),
      sendWhatsAppAlert(timestamp),
    ]);

    const formatResult = (
      result: PromiseSettledResult<ChannelResult>,
      channelName: "EMAIL" | "CALL" | "TELEGRAM" | "SMS" | "WHATSAPP"
    ): ChannelResult => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        channel: channelName,
        status: "FAILED",
        error: result.reason instanceof Error ? result.reason.message : "Internal Channel Exception",
      };
    };

    const emailChannel = formatResult(emailResult, "EMAIL");
    const callChannel = formatResult(callResult, "CALL");
    const telegramChannel = formatResult(telegramResult, "TELEGRAM");
    const smsChannel = formatResult(smsResult, "SMS");
    const whatsappChannel = formatResult(whatsappResult, "WHATSAPP");

    // 4. Activity Logging in PostgreSQL (Fail-Safe)
    let activityLogged = false;
    try {
      await prisma.alertLog.create({
        data: {
          id: alertId,
          triggeredAt: new Date(timestamp),
          ipAddress: ip,
          userAgent: userAgent,
          emailStatus: emailChannel.status,
          emailMessageId: emailChannel.messageId,
          emailError: emailChannel.error,
          callStatus: callChannel.status,
          callMessageId: callChannel.messageId,
          callError: callChannel.error,
          smsStatus: smsChannel.status,
          smsMessageId: smsChannel.messageId,
          smsError: smsChannel.error,
          whatsappStatus: whatsappChannel.status,
          whatsappMessageId: whatsappChannel.messageId,
          whatsappError: whatsappChannel.error,
        },
      });
      activityLogged = true;
    } catch (dbError) {
      console.warn(
        "[Activity Log] Could not persist alert log into PostgreSQL:",
        dbError instanceof Error ? dbError.message : dbError
      );
      activityLogged = false;
    }

    // 5. Summary Message for Screen Readers
    const channelSummaries: string[] = [];
    if (callChannel.status === "SENT") channelSummaries.push("Emergency voice call placed");
    else if (callChannel.status === "FAILED") channelSummaries.push("Voice call failed");

    if (telegramChannel.status === "SENT") channelSummaries.push("Telegram alert sent");
    else if (telegramChannel.status === "FAILED") channelSummaries.push("Telegram failed");

    if (emailChannel.status === "SENT") channelSummaries.push("Email sent");
    else if (emailChannel.status === "FAILED") channelSummaries.push("Email failed");

    if (smsChannel.status === "SENT") channelSummaries.push("SMS sent");
    if (whatsappChannel.status === "SENT") channelSummaries.push("WhatsApp sent");

    const summary = channelSummaries.length > 0
      ? channelSummaries.join(", ") + (activityLogged ? ". Activity recorded in database." : ".")
      : "Alert processed. Check channel delivery.";

    const responsePayload: SecurityAlertResponse = {
      success: true,
      alertId,
      triggeredAt: timestamp,
      channels: {
        email: emailChannel,
        call: callChannel,
        telegram: telegramChannel,
        sms: smsChannel,
        whatsapp: whatsappChannel,
      },
      activityLogged,
      summary,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("[Security Alert API] Unexpected fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while dispatching security alert.",
      },
      { status: 500 }
    );
  }
}
