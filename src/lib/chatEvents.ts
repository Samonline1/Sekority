import { EventEmitter } from "events";

export interface ChatMessagePayload {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// Global EventEmitter for server-sent events
const globalForChatEvents = globalThis as unknown as {
  chatEventEmitter: EventEmitter | undefined;
};

export const chatEvents =
  globalForChatEvents.chatEventEmitter ?? new EventEmitter();

// Allow unlimited listeners for SSE clients
chatEvents.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") {
  globalForChatEvents.chatEventEmitter = chatEvents;
}
