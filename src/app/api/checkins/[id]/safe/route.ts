import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

// POST /api/checkins/[id]/safe - Marks user as safe (completes session)
export async function POST(
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
        { success: false, error: "Check-in session not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const updated = await prisma.safetyCheckin.update({
      where: { id },
      data: {
        completedAt: now,
        status: "COMPLETED",
      },
    });

    const safeHtml = `✅ <b>SAFETY CHECK-IN CONFIRMED SAFE</b>\n\nUser checked in on time and marked themselves <b>SAFE</b> at ${now.toLocaleTimeString()}.\n\nTimer session completed successfully.`;

    sendJourneyTelegramAlert(safeHtml).catch(() => {});

    return NextResponse.json({
      success: true,
      checkin: updated,
    });
  } catch (error) {
    console.error("[Safe Checkin Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm check-in safety" },
      { status: 500 }
    );
  }
}
