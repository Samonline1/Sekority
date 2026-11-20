"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface CheckinSession {
  id: string;
  userId: string;
  destination: string | null;
  message: string | null;
  durationMins: number;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "ESCALATED";
  createdAt: string;
}

export default function CheckinPage() {
  const [activeCheckin, setActiveCheckin] = useState<CheckinSession | null>(null);
  const [history, setHistory] = useState<CheckinSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form setup state
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    totalSeconds: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({
    totalSeconds: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Active & Recent Check-ins
  const fetchCheckins = useCallback(async () => {
    try {
      const res = await fetch("/api/checkins");
      const data = await res.json();
      if (data.success) {
        setActiveCheckin(data.activeCheckin);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to load check-ins:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  // 2. Countdown Calculation loop
  useEffect(() => {
    if (!activeCheckin || activeCheckin.status !== "ACTIVE") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateCountdown = () => {
      const expiry = new Date(activeCheckin.expiresAt).getTime();
      const now = Date.now();
      const diffMs = expiry - now;

      if (diffMs <= 0) {
        const overdueSeconds = Math.floor(Math.abs(diffMs) / 1000);
        setTimeLeft({
          totalSeconds: 0,
          minutes: Math.floor(overdueSeconds / 60),
          seconds: overdueSeconds % 60,
          isOverdue: true,
        });

        // Trigger auto-refresh if overdue by > 3 mins to let backend mark ESCALATED
        if (overdueSeconds > 180 && activeCheckin.status === "ACTIVE") {
          fetchCheckins();
        }
      } else {
        const remainingSeconds = Math.floor(diffMs / 1000);
        setTimeLeft({
          totalSeconds: remainingSeconds,
          minutes: Math.floor(remainingSeconds / 60),
          seconds: remainingSeconds % 60,
          isOverdue: false,
        });
      }
    };

    updateCountdown();
    timerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCheckin, fetchCheckins]);

  // 3. Start a new Check-in session
  const handleStartCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMins: selectedDuration,
          destination: destination.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCheckin(data.checkin);
        setDestination("");
        setMessage("");
      } else {
        alert(data.error || "Failed to start safety check-in.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  // 4. Mark Safe (Complete Session)
  const handleMarkSafe = async () => {
    if (!activeCheckin) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}/safe`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCheckin(null);
        fetchCheckins();
      } else {
        alert(data.error || "Failed to confirm safety.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Extend Timer (+15 mins)
  const handleExtend = async () => {
    if (!activeCheckin) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMins: 15 }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCheckin(data.checkin);
      } else {
        alert(data.error || "Failed to extend timer.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Cancel Session
  const handleCancel = async () => {
    if (!activeCheckin) return;
    if (!confirm("Are you sure you want to cancel this safety check-in?")) return;

    setActionLoading(true);

    try {
      const res = await fetch(`/api/checkins/${activeCheckin.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCheckin(null);
        fetchCheckins();
      } else {
        alert(data.error || "Failed to cancel check-in.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-black">
      {/* Subheader */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="font-medium text-neutral-500 hover:text-black flex items-center space-x-1"
          >
            <span>← Back to SOS</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
              ROUTE: /chk
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Header Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-black text-white rounded text-xs font-mono font-medium">
            <span>⏱️ SAFETY CHECK-IN</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-2">
            Automated Safety Timer
          </h1>
          <p className="text-sm text-neutral-600">
            Set a timer when entering an unfamiliar situation. If you don&apos;t check in before the deadline, SEKORITY automatically escalates an emergency alert.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-500 animate-pulse">
            Loading safety session status...
          </div>
        ) : activeCheckin && activeCheckin.status === "ACTIVE" ? (
          /* ACTIVE CHECKIN CARD */
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                <span>Active Safety Session</span>
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                Deadline:{" "}
                {new Date(activeCheckin.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Large Countdown Clock */}
            <div
              className={`text-center py-6 rounded-xl border ${
                timeLeft.isOverdue
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-neutral-50 border-neutral-200 text-black"
              }`}
            >
              <div className="text-xs font-mono font-bold tracking-widest uppercase mb-1">
                {timeLeft.isOverdue ? "⚠️ GRACE PERIOD EXPIRED / OVERDUE" : "TIME REMAINING"}
              </div>
              <div className="text-5xl font-black font-mono tracking-tighter">
                {timeLeft.isOverdue ? "+" : ""}
                {String(timeLeft.minutes).padStart(2, "0")}:
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
              <div className="text-xs mt-2 text-neutral-600">
                {timeLeft.isOverdue
                  ? "Emergency escalation will trigger if you do not confirm safety!"
                  : `Started for ${activeCheckin.durationMins} minutes`}
              </div>
            </div>

            {/* Session Info Details */}
            {(activeCheckin.destination || activeCheckin.message) && (
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs space-y-2">
                {activeCheckin.destination && (
                  <div className="flex items-start space-x-2">
                    <span className="font-bold text-neutral-700">📍 Destination:</span>
                    <span className="text-neutral-900 font-medium">
                      {activeCheckin.destination}
                    </span>
                  </div>
                )}
                {activeCheckin.message && (
                  <div className="flex items-start space-x-2">
                    <span className="font-bold text-neutral-700">💬 Note:</span>
                    <span className="text-neutral-900">{activeCheckin.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleMarkSafe}
                disabled={actionLoading}
                className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 active:scale-[0.99] transition shadow-md flex items-center justify-center space-x-2"
              >
                <span>✅ I AM SAFE (COMPLETE CHECK-IN)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={actionLoading}
                  className="py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs rounded-xl border border-neutral-300 transition flex items-center justify-center space-x-1"
                >
                  <span>⏱️ +15 Mins Extend</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="py-3 bg-white hover:bg-neutral-100 text-neutral-600 font-bold text-xs rounded-xl border border-neutral-300 transition flex items-center justify-center space-x-1"
                >
                  <span>✕ Cancel Session</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* START NEW CHECK-IN FORM */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold tracking-tight">
              Start Safety Check-in
            </h2>

            <form onSubmit={handleStartCheckin} className="space-y-5">
              {/* Duration Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Select Timer Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSelectedDuration(mins)}
                      className={`py-3 rounded-xl font-mono text-sm font-bold border transition ${
                        selectedDuration === mins
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Destination (Optional)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Walking home from Metro, Meeting client..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-black transition"
                />
              </div>

              {/* Note / Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Emergency Note / Instructions (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="e.g. If I don't check in, please call my sister immediately."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-black transition"
                />
              </div>

              {/* Start Button */}
              <button
                type="submit"
                disabled={isStarting}
                className="w-full py-4 bg-black text-white font-black text-sm rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition shadow-md flex items-center justify-center space-x-2"
              >
                <span>{isStarting ? "Starting Session..." : `Start ${selectedDuration}-Minute Safety Timer →`}</span>
              </button>
            </form>
          </div>
        )}

        {/* RECENT CHECK-IN HISTORY */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">Recent Sessions</h3>
            <span className="text-xs text-neutral-500 font-mono">
              {history.length} logged
            </span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3 text-center">
              No recent safety sessions logged yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-neutral-900">
                      {item.durationMins}m Timer{" "}
                      {item.destination ? `• ${item.destination}` : ""}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Started: {new Date(item.startedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "ESCALATED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Nav Footer Pills */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href="/trip"
            className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            🚗 Safe Trip
          </Link>
          <Link
            href="/gps"
            className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            📍 GPS Share
          </Link>
          <Link
            href="/ring"
            className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            👥 Circle
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            💬 Chat
          </Link>
        </div>
      </main>
    </div>
  );
}
