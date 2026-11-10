import { NextRequest } from "next/server";
import { chatEvents, ChatMessagePayload } from "@/lib/chatEvents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection greeting
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`)
      );

      // 2. Real-time message listener
      const onNewMessage = (message: ChatMessagePayload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      chatEvents.on("newMessage", onNewMessage);

      // 3. Heartbeat ping every 15s to keep connection open
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(interval);
        chatEvents.off("newMessage", onNewMessage);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
