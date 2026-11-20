import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendJourneyTelegramAlert } from "@/lib/services/journeyNotifier";

// GET /api/contacts - Lists all emergency contacts
export async function GET() {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("[Get Contacts Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch emergency contacts" },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Adds a new trusted contact
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      phone,
      email,
      relationship = "Trusted Contact",
      isPrimary = false,
      notifyByTelegram = true,
      notifyByEmail = true,
      notifyBySMS = false,
      userId = "user_sb",
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Contact name and phone number are required." },
        { status: 400 }
      );
    }

    // If marked as primary, reset any other primary contacts
    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        userId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        relationship: relationship ? relationship.trim() : "Trusted Contact",
        isPrimary: Boolean(isPrimary),
        verified: true,
        notifyByTelegram: Boolean(notifyByTelegram),
        notifyByEmail: Boolean(notifyByEmail),
        notifyBySMS: Boolean(notifyBySMS),
      },
    });

    // Notify on Telegram
    const notice = `👥 <b>NEW TRUSTED CONTACT ADDED</b>\n\n<b>Name:</b> ${contact.name}\n<b>Phone:</b> ${contact.phone}${
      contact.email ? `\n<b>Email:</b> ${contact.email}` : ""
    }\n<b>Relationship:</b> ${contact.relationship}${contact.isPrimary ? "\n⭐ <b>Primary Contact:</b> Yes" : ""}`;

    sendJourneyTelegramAlert(notice).catch(() => {});

    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("[Create Contact Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add contact" },
      { status: 500 }
    );
  }
}
