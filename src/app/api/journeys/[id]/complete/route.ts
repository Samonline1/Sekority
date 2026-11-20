import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const journey = await prisma.journey.findUnique({
      where: { id },
    });

    if (!journey) {
      return NextResponse.json(
        { success: false, error: "Journey not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const actualDurationMinutes = Math.max(
      1,
      Math.round((now.getTime() - journey.startedAt.getTime()) / 60000)
    );

    const updated = await prisma.journey.update({
      where: { id },
      data: {
        completedAt: now,
        actualDurationMinutes,
        status: "COMPLETED",
        notifiedCompleted: true,
      },
    });

    const completionNotice = `✅ <b>JOURNEY COMPLETED SAFELY</b>\n\nUser has marked themselves <b>safely arrived</b> at <b>${journey.toLocation}</b>.\n\n⏱️ <b>Total Travel Time:</b> ${actualDurationMinutes} minutes (Expected: ${journey.expectedDurationMins} mins)\n📍 <b>From:</b> ${journey.fromLocation}`;

    sendJourneyTelegramAlert(completionNotice).catch(() => {});

    return NextResponse.json({
      success: true,
      journey: updated,
    });
  } catch (error) {
    console.error("[Complete Journey Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark journey as completed" },
      { status: 500 }
    );
  }
}
