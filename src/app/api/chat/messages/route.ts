import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatEvents, ChatMessagePayload } from "@/lib/chatEvents";

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 100, // Load latest 100 messages
    });

    return NextResponse.json({
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Get Messages Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, text } = body;

    if (!userId || !text || String(text).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Sender ID and message content are required." },
        { status: 400 }
      );
    }

    // Verify authorized user
    const user = await prisma.chatUser.findUnique({
      where: { userId: String(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized sender." },
        { status: 403 }
      );
    }

    // Persist to Neon DB
    const created = await prisma.chatMessage.create({
      data: {
        userId: user.userId,
        userName: user.name,
        text: String(text).trim(),
      },
    });

    const payload: ChatMessagePayload = {
      id: created.id,
      userId: created.userId,
      userName: created.userName,
      text: created.text,
      createdAt: created.createdAt.toISOString(),
    };

    // Broadcast in real-time to active SSE streams
    chatEvents.emit("newMessage", payload);

    return NextResponse.json({
      success: true,
      message: payload,
    });
  } catch (error) {
    console.error("[Post Message Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to persist chat message" },
      { status: 500 }
    );
  }
}
