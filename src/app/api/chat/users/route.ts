import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Returns public list of seeded authorized chat users (Codes are NEVER returned)
export async function GET() {
  try {
    const users = await prisma.chatUser.findMany({
      select: {
        userId: true,
        name: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("[Chat Users API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch authorized users" },
      { status: 500 }
    );
  }
}
