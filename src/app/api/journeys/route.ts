import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

// GET /api/journeys - Returns active journey + recent journey history
export async function GET() {
  try {
    const active = await prisma.journey.findFirst({
      where: {
        status: { in: ["ACTIVE", "DELAYED"] },
      },
      orderBy: { startedAt: "desc" },
    });

    // Check for Overdue status if active
    let activeJourney = active;
    if (active && active.status === "ACTIVE") {
      const now = new Date();
      // 5-minute buffer past expected arrival time
      const overdueThreshold = new Date(active.expectedArrivalAt.getTime() + 5 * 60000);

      if (now > overdueThreshold && !active.notifiedOverdue) {
        const elapsedMins = Math.round((now.getTime() - active.startedAt.getTime()) / 60000);

        activeJourney = await prisma.journey.update({
          where: { id: active.id },
          data: {
            status: "DELAYED",
            notifiedOverdue: true,
          },
        });

        // Trigger Overdue Telegram Alert
        const alertHtml = `⚠️ <b>JOURNEY OVERDUE ALERT!</b>\n\nUser has <b>exceeded the expected travel time</b> for their journey to <b>${active.toLocation}</b>!\n\n⏱️ <b>Elapsed:</b> ${elapsedMins} mins (Expected: ${active.expectedDurationMins} mins)\n📍 <b>From:</b> ${active.fromLocation}\n🚕 <b>Transport:</b> ${active.transportMode}${
          active.trackingUrl ? `\n🔗 <b>Live Ride Track:</b> ${active.trackingUrl}` : ""
        }\n\n<i>⚠️ Please check on user safety or verify arrival immediately.</i>`;

        sendJourneyTelegramAlert(alertHtml).catch(() => {});
      }
    }

    const history = await prisma.journey.findMany({
      where: {
        status: { in: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      activeJourney,
      history,
    });
  } catch (error) {
    console.error("[Get Journeys Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch journeys" },
      { status: 500 }
    );
  }
}

// POST /api/journeys - Starts a new journey
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      fromLocation,
      toLocation,
      purpose,
      transportMode = "CAB",
      expectedDurationMins = 30,
      trackingUrl,
      userId = "user_sb",
    } = body;

    if (!fromLocation || !toLocation) {
      return NextResponse.json(
        { success: false, error: "Starting location and destination are required." },
        { status: 400 }
      );
    }

    const duration = Math.max(5, parseInt(String(expectedDurationMins), 10) || 30);
    const now = new Date();
    const expectedArrivalAt = new Date(now.getTime() + duration * 60000);

    // Cancel any existing active journey
    await prisma.journey.updateMany({
      where: { status: { in: ["ACTIVE", "DELAYED"] } },
      data: { status: "CANCELLED" },
    });

    const journey = await prisma.journey.create({
      data: {
        userId,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        purpose: purpose ? purpose.trim() : null,
        transportMode,
        trackingUrl: trackingUrl && trackingUrl.trim() ? trackingUrl.trim() : null,
        expectedDurationMins: duration,
        expectedArrivalAt,
        startedAt: now,
        status: "ACTIVE",
        notifiedStarted: true,
      },
    });

    const expectedTimeFormatted = expectedArrivalAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const modeLabels: Record<string, string> = {
      CAB: "🚕 Cab / Uber",
      BUS: "🚌 Public Bus",
      METRO: "🚆 Metro / Train",
      WALKING: "🚶 Walking",
      CAR: "🚗 Personal Vehicle",
    };

    const telegramMessage = `🚗 <b>SAFE JOURNEY: STARTED</b>\n\n<b>From:</b> ${journey.fromLocation}\n<b>To:</b> ${journey.toLocation}\n<b>Mode:</b> ${modeLabels[journey.transportMode] || journey.transportMode}\n<b>Estimated Time:</b> ${duration} minutes\n<b>Expected Arrival:</b> ${expectedTimeFormatted}${
      journey.purpose ? `\n<b>Purpose:</b> ${journey.purpose}` : ""
    }${
      journey.trackingUrl
        ? `\n\n🔗 <b>Live Ride Track:</b> ${journey.trackingUrl}`
        : "\n\n<i>(Live Uber link not attached yet. User can add it anytime during the trip).</i>"
    }`;

    sendJourneyTelegramAlert(telegramMessage).catch(() => {});

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error) {
    console.error("[Create Journey Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate journey" },
      { status: 500 }
    );
  }
}
