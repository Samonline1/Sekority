import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { trackingUrl, extendMinutes } = body;

    const existing = await prisma.journey.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Journey not found" },
        { status: 404 }
      );
    }

    const updateData: {
      trackingUrl?: string | null;
      expectedArrivalAt?: Date;
      expectedDurationMins?: number;
      status?: string;
    } = {};

    let telegramNotice = "";

    // 1. Updating or Attaching Live Tracking Link (e.g. Uber/Ola share URL)
    if (trackingUrl !== undefined) {
      const cleanUrl = trackingUrl ? trackingUrl.trim() : null;
      updateData.trackingUrl = cleanUrl;

      if (cleanUrl) {
        telegramNotice += `📍 <b>LIVE RIDE URL ATTACHED</b>\n\nUser has attached a live tracking link for their journey to <b>${existing.toLocation}</b>:\n🔗 <b>Live Track:</b> ${cleanUrl}`;
      }
    }

    // 2. Extending Journey Duration (e.g. Traffic Delay)
    if (extendMinutes && typeof extendMinutes === "number" && extendMinutes > 0) {
      const newArrival = new Date(existing.expectedArrivalAt.getTime() + extendMinutes * 60000);
      updateData.expectedArrivalAt = newArrival;
      updateData.expectedDurationMins = existing.expectedDurationMins + extendMinutes;
      updateData.status = "ACTIVE"; // reset back to active if it was marked delayed

      const newTimeFormatted = newArrival.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      telegramNotice += `\n\n⏱️ <b>JOURNEY TIME EXTENDED (+${extendMinutes}m)</b>\nNew estimated arrival at <b>${existing.toLocation}</b>: <b>${newTimeFormatted}</b>`;
    }

    const updated = await prisma.journey.update({
      where: { id },
      data: updateData,
    });

    if (telegramNotice) {
      sendJourneyTelegramAlert(telegramNotice.trim()).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      journey: updated,
    });
  } catch (error) {
    console.error("[Update Journey Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update journey" },
      { status: 500 }
    );
  }
}
