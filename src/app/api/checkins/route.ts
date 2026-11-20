import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

// GET /api/checkins - Returns active check-in + recent history
export async function GET() {
  try {
    const active = await prisma.safetyCheckin.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });

    let activeCheckin = active;

    // Check for missed check-in escalation
    if (active && active.status === "ACTIVE") {
      const now = new Date();
      // 3-minute grace period past expiration
      const gracePeriod = new Date(active.expiresAt.getTime() + 3 * 60000);

      if (now > gracePeriod) {
        activeCheckin = await prisma.safetyCheckin.update({
          where: { id: active.id },
          data: { status: "ESCALATED" },
        });

        // Trigger Escalation Alert on Telegram
        const escalationHtml = `🚨 <b>SAFETY CHECK-IN MISSED & ESCALATED!</b>\n\nUser did <b>not check in</b> before their safety timer deadline!\n\n⏱️ <b>Deadline:</b> ${active.expiresAt.toLocaleTimeString()}\n${
          active.destination ? `📍 <b>Expected Destination:</b> ${active.destination}\n` : ""
        }${active.message ? `💬 <b>User Note:</b> ${active.message}\n` : ""}\n<i>⚠️ Emergency Escalation triggered. Please verify user safety immediately!</i>`;

        sendJourneyTelegramAlert(escalationHtml).catch(() => {});
      }
    }

    const history = await prisma.safetyCheckin.findMany({
      where: { status: { in: ["COMPLETED", "CANCELLED", "ESCALATED"] } },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      activeCheckin,
      history,
    });
  } catch (error) {
    console.error("[Get Checkins Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}

// POST /api/checkins - Starts a new safety timer session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { durationMins = 30, destination, message, userId = "user_sb" } = body;

    const duration = Math.max(5, parseInt(String(durationMins), 10) || 30);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60000);

    // Cancel existing active sessions
    await prisma.safetyCheckin.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const checkin = await prisma.safetyCheckin.create({
      data: {
        userId,
        destination: destination ? destination.trim() : null,
        message: message ? message.trim() : null,
        durationMins: duration,
        startedAt: now,
        expiresAt,
        status: "ACTIVE",
      },
    });

    const deadlineFormatted = expiresAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const alertHtml = `⏱️ <b>SAFETY CHECK-IN STARTED</b>\n\nUser has activated a <b>${duration}-minute Safety Check-in Timer</b>.\n\n⏳ <b>Check-in Deadline:</b> ${deadlineFormatted}${
      checkin.destination ? `\n📍 <b>Destination:</b> ${checkin.destination}` : ""
    }${
      checkin.message ? `\n💬 <b>Note:</b> ${checkin.message}` : ""
    }\n\n<i>If the user fails to check in before the deadline, an emergency escalation will trigger automatically.</i>`;

    sendJourneyTelegramAlert(alertHtml).catch(() => {});

    return NextResponse.json({
      success: true,
      checkin,
    });
  } catch (error) {
    console.error("[Create Checkin Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start safety check-in" },
      { status: 500 }
    );
  }
}
