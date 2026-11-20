import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

// PATCH /api/checkins/[id] - Extends timer or updates session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { extendMins = 15 } = body;

    const checkin = await prisma.safetyCheckin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "Check-in not found" },
        { status: 404 }
      );
    }

    if (checkin.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Only active sessions can be extended" },
        { status: 400 }
      );
    }

    const currentExpiry = new Date(checkin.expiresAt);
    const newExpiresAt = new Date(currentExpiry.getTime() + extendMins * 60000);

    const updated = await prisma.safetyCheckin.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        durationMins: checkin.durationMins + extendMins,
      },
    });

    const extendedTimeFormatted = newExpiresAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const alertHtml = `⏱️ <b>SAFETY CHECK-IN EXTENDED (+${extendMins}m)</b>\n\nUser extended their safety timer.\n⏳ <b>New Deadline:</b> ${extendedTimeFormatted}`;
    sendJourneyTelegramAlert(alertHtml).catch(() => {});

    return NextResponse.json({
      success: true,
      checkin: updated,
    });
  } catch (error) {
    console.error("[Extend Checkin Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to extend check-in timer" },
      { status: 500 }
    );
  }
}

// DELETE /api/checkins/[id] - Cancels the active session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const checkin = await prisma.safetyCheckin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "Check-in not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.safetyCheckin.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    const alertHtml = `ℹ️ <b>SAFETY CHECK-IN CANCELLED</b>\n\nUser manually cancelled their safety timer session.`;
    sendJourneyTelegramAlert(alertHtml).catch(() => {});

    return NextResponse.json({
      success: true,
      checkin: updated,
    });
  } catch (error) {
    console.error("[Cancel Checkin Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel check-in" },
      { status: 500 }
    );
  }
}
