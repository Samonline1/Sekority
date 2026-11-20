import { NextRequest, NextResponse } from "next/server";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, accuracy, note, address } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Valid latitude and longitude coordinates are required." },
        { status: 400 }
      );
    }

    const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    const gmapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const timestamp = new Date().toLocaleTimeString();

    const alertHtml = `📍 <b>LIVE GPS LOCATION BROADCAST</b>\n\nUser has shared their exact GPS location coordinates via SEKORITY.\n\n🌐 <b>Coordinates:</b> <code>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</code>\n🎯 <b>Accuracy:</b> ±${Math.round(accuracy || 10)} meters\n⏱️ <b>Captured At:</b> ${timestamp}${
      address ? `\n📍 <b>Nearest Location:</b> ${address}` : ""
    }${note ? `\n💬 <b>User Note:</b> ${note}` : ""}\n\n🗺️ <b>Open in Maps:</b>\n• <a href="${gmapsUrl}">Google Maps</a>\n• <a href="${osmUrl}">OpenStreetMap</a>`;

    const dispatched = await sendJourneyTelegramAlert(alertHtml);

    return NextResponse.json({
      success: true,
      dispatched,
      osmUrl,
      gmapsUrl,
    });
  } catch (error) {
    console.error("[GPS Share Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to broadcast GPS location" },
      { status: 500 }
    );
  }
}
