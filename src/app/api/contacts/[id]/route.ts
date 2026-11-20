import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Contact removed" });
  } catch (error) {
    console.error("[Delete Contact Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove contact" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 }
      );
    }

    if (body.isPrimary === true) {
      await prisma.emergencyContact.updateMany({
        where: { userId: existing.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        isPrimary: body.isPrimary !== undefined ? Boolean(body.isPrimary) : undefined,
        notifyByTelegram:
          body.notifyByTelegram !== undefined ? Boolean(body.notifyByTelegram) : undefined,
        notifyByEmail:
          body.notifyByEmail !== undefined ? Boolean(body.notifyByEmail) : undefined,
        notifyBySMS: body.notifyBySMS !== undefined ? Boolean(body.notifyBySMS) : undefined,
      },
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error) {
    console.error("[Patch Contact Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update contact" },
      { status: 500 }
    );
  }
}
