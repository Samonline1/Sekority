"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface UserProfile {
  userId: string;
  name: string;
  role: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

const AUTO_LOGOUT_SECONDS = 300; // 5 minutes = 300 seconds

export default function ChatPage() {
  // Auth state
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [passcode, setPasscode] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 5-minute Auto-logout Countdown state
  const [timeLeft, setTimeLeft] = useState<number>(AUTO_LOGOUT_SECONDS);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [liveNotice, setLiveNotice] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load Seeded Users & Restore session from localStorage if available
  useEffect(() => {
    fetch("/api/chat/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.users.length > 0) {
          setAvailableUsers(data.users);
          setSelectedUserId(data.users[0].userId);
        }
      })
      .catch((err) => console.error("Could not fetch users:", err));

    const saved = localStorage.getItem("seko_chat_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.userId && parsed.name) {
          setCurrentUser(parsed);
        }
      } catch {}
    }
  }, []);

  // 2. Logout Handler (Clears session & resets timer)
  const handleLogout = useCallback(() => {
    localStorage.removeItem("seko_chat_user");
    setCurrentUser(null);
    setPasscode("");
    setTimeLeft(AUTO_LOGOUT_SECONDS);
  }, []);

  // 3. 5-Minute Auto-Logout Timer Effect
  useEffect(() => {
    if (!currentUser) return;
    setTimeLeft(AUTO_LOGOUT_SECONDS);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, handleLogout]);

  // 4. Load Chat History
  const loadMessages = async () => {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Could not load messages:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser]);

  // 5. Connect Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!currentUser) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/chat/stream");

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
      });

      eventSource.addEventListener("message", (e) => {
        try {
          const newMsg: Message = JSON.parse(e.data);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setLiveNotice(`New message from ${newMsg.userName}`);
        } catch {}
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
      };
    };

    connectSSE();

    // Fallback polling every 4 seconds in case SSE is disrupted
    pollInterval = setInterval(loadMessages, 4000);

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentUser]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !passcode.trim()) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, code: passcode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setTimeLeft(AUTO_LOGOUT_SECONDS);
        localStorage.setItem("seko_chat_user", JSON.stringify(data.user));
        setPasscode("");
      } else {
        setAuthError(data.error || "Incorrect security code.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Sending Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.userId,
          text: textToSend,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error("Failed to post message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Format Helper: Seconds to MM:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Group messages by readable date
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  // ==========================================
  // VIEW 1: "WHO ARE YOU?" ENTRANCE GATE
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col font-sans">
        <header className="border-b border-neutral-200 py-4 px-4 bg-white">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-bold text-neutral-600 hover:text-black uppercase tracking-wider flex items-center space-x-1"
            >
              <span>← Back to Alert</span>
            </Link>
            <span className="font-extrabold text-sm tracking-tight text-black">
              SEKO CHAT
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-[#F6F6F6] border-2 border-black rounded-2xl p-6 sm:p-8 shadow-md">
            <div className="text-center mb-6">
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 font-bold block mb-1">
                SECURE ROOM ACCESS
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
                Who are you?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Select your authorized profile and enter your security passcode.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Profile Selector */}
              <div>
                <label
                  htmlFor="user-select"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  Select User
                </label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-12 px-3 bg-white border border-neutral-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {availableUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Security Passcode Input */}
              <div>
                <label
                  htmlFor="passcode-input"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  Security Passcode
                </label>
                <input
                  id="passcode-input"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter 4-digit code"
                  className="w-full h-12 px-4 bg-white border border-neutral-300 rounded-xl text-base tracking-widest font-mono text-black placeholder:tracking-normal placeholder:font-sans placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Default seed codes: SB (1111), ZB (2222), SH (3333), Emergency Contact (4444).
                </p>
              </div>

              {/* Error message */}
              {authError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl"
                >
                  {authError}
                </div>
              )}

              {/* Enter Button */}
              <button
                type="submit"
                disabled={isAuthenticating || !passcode.trim()}
                className={`w-full h-14 rounded-xl font-bold text-base tracking-tight transition-all duration-150 flex items-center justify-center
                  ${
                    isAuthenticating || !passcode.trim()
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-black text-white hover:bg-neutral-800 active:scale-[0.99] cursor-pointer shadow-sm"
                  }
                `}
              >
                {isAuthenticating ? "VERIFYING..." : "ENTER CHAT ROOM"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE CHAT SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Screen reader live announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveNotice}
      </div>

      {/* Top Uber-Inspired Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs font-bold text-neutral-500 hover:text-black uppercase tracking-wider"
            >
              ← Alert
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-black">
                  Emergency Room
                </span>
                <span
                  title={isConnected ? "Real-time SSE active" : "Connecting..."}
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                  }`}
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Logged in as <strong className="text-black">{currentUser.name}</strong>
              </p>
            </div>
          </div>

          {/* Top Actions: Auto-Logout Countdown + Logout Button + Switch User */}
          <div className="flex items-center space-x-2">
            {/* Top Auto-Logout Countdown */}
            <div
              title="Automatic session logout countdown"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-neutral-100 rounded-lg text-xs font-mono text-neutral-600 border border-neutral-200"
            >
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Timer:</span>
              <span className="font-bold text-black">{formatCountdown(timeLeft)}</span>
            </div>

            {/* Logout Button (Right before Switch User) */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 bg-neutral-100 text-black rounded-lg hover:bg-neutral-200 transition-colors"
              title="Sign out of current account"
            >
              Logout
            </button>

            {/* Switch User Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
              title="Switch user profile"
            >
              Switch User
            </button>
          </div>
        </div>
      </header>

      {/* Message Feed Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 overflow-y-auto flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-neutral-400">
            <span className="text-2xl mb-2">💬</span>
            <p className="text-sm font-semibold text-neutral-600">No messages yet.</p>
            <p className="text-xs text-neutral-400 max-w-xs mt-1">
              Start the emergency conversation. All authorized contacts will see messages in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const isCurrentUser = msg.userId === currentUser.userId;
              const showDate =
                idx === 0 ||
                formatDateLabel(msg.createdAt) !== formatDateLabel(messages[idx - 1].createdAt);

              return (
                <div key={msg.id || idx}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-neutral-400 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                        {formatDateLabel(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {isCurrentUser ? (
                    /* Current User's Message (Black bubble on right) */
                    <div className="flex flex-col items-end mb-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 px-1">
                        You ({currentUser.name})
                      </span>
                      <div className="bg-black text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] sm:max-w-[70%] shadow-xs">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] text-neutral-400 mt-1 block text-right font-mono">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Other Contacts' Message (Light grey bubble on left with NAME PROMINENTLY ABOVE) */
                    <div className="flex flex-col items-start mb-2.5">
                      {/* Sub-header name directly above message */}
                      <span className="text-[11px] font-extrabold text-black uppercase tracking-wider mb-1 px-1">
                        {msg.userName}
                      </span>
                      <div className="bg-[#F6F6F6] border border-neutral-200 text-black px-4 py-2.5 rounded-2xl rounded-tl-xs max-w-[85%] sm:max-w-[70%]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] text-neutral-500 mt-1 block text-right font-mono">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Message Input Bar & Bottom Tiny Countdown */}
      <footer className="border-t border-neutral-200 bg-white sticky bottom-0 z-20 py-2.5 px-4">
        <div className="max-w-2xl mx-auto flex flex-col space-y-1.5">
          {/* Very tiny light grey countdown right above input box at bottom */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-neutral-400 font-mono tracking-tight uppercase">
              Secure Channel
            </span>
            <span className="text-[10px] text-neutral-400 font-mono tracking-tight">
              auto logout in {formatCountdown(timeLeft)}
            </span>
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message as ${currentUser.name}...`}
              className="flex-1 h-12 px-4 bg-[#F6F6F6] border border-neutral-200 rounded-xl text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className={`h-12 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center
                ${
                  isSending || !inputText.trim()
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-neutral-800 active:scale-[0.98] cursor-pointer"
                }
              `}
            >
              {isSending ? "..." : "Send"}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
