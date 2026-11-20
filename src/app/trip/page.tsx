"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";

interface Journey {
  id: string;
  userId: string;
  fromLocation: string;
  toLocation: string;
  purpose?: string | null;
  transportMode: string;
  trackingUrl?: string | null;
  expectedDurationMins: number;
  expectedArrivalAt: string;
  startedAt: string;
  completedAt?: string | null;
  actualDurationMinutes?: number | null;
  status: "ACTIVE" | "COMPLETED" | "DELAYED" | "CANCELLED";
  createdAt: string;
}

export default function TripPage() {
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [history, setHistory] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // New Journey Form State
  const [isCreating, setIsCreating] = useState(false);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [purpose, setPurpose] = useState("");
  const [transportMode, setTransportMode] = useState("CAB");
  const [durationMins, setDurationMins] = useState(30);
  const [rideUrl, setRideUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Tracking URL in Active Ride
  const [editingUrl, setEditingUrl] = useState(false);
  const [newTrackingUrl, setNewTrackingUrl] = useState("");

  // Elapsed Time Counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 1. Fetch Active Journey & History
  const fetchJourneys = useCallback(async () => {
    try {
      const res = await fetch("/api/journeys");
      const data = await res.json();
      if (data.success) {
        setActiveJourney(data.activeJourney || null);
        setHistory(data.history || []);
        if (data.activeJourney?.trackingUrl) {
          setNewTrackingUrl(data.activeJourney.trackingUrl);
        }
      }
    } catch (err) {
      console.error("Failed to load journeys:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJourneys();
    // Poll every 5 seconds to track overdue status and updates
    const interval = setInterval(fetchJourneys, 5000);
    return () => clearInterval(interval);
  }, [fetchJourneys]);

  // 2. Elapsed Timer for Active Journey
  useEffect(() => {
    if (!activeJourney) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeJourney.startedAt).getTime();

    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeJourney]);

  // 3. Start New Journey
  const handleStartJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLoc.trim() || !toLoc.trim()) {
      setFormError("Starting location and destination are required.");
      return;
    }

    setFormError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocation: fromLoc.trim(),
          toLocation: toLoc.trim(),
          purpose: purpose.trim() || undefined,
          transportMode,
          expectedDurationMins: Number(durationMins) || 30,
          trackingUrl: rideUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveJourney(data.journey);
        setIsCreating(false);
        setFromLoc("");
        setToLoc("");
        setPurpose("");
        setRideUrl("");
        fetchJourneys();
      } else {
        setFormError(data.error || "Failed to start journey.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Update Tracking Link in Active Journey
  const handleUpdateTrackingUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJourney) return;

    try {
      const res = await fetch(`/api/journeys/${activeJourney.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingUrl: newTrackingUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveJourney(data.journey);
        setEditingUrl(false);
      }
    } catch (err) {
      console.error("Failed to update tracking URL:", err);
    }
  };

  // 5. Extend Duration (+10 mins)
  const handleExtend = async (mins: number) => {
    if (!activeJourney) return;
    try {
      const res = await fetch(`/api/journeys/${activeJourney.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMinutes: mins }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveJourney(data.journey);
      }
    } catch (err) {
      console.error("Failed to extend duration:", err);
    }
  };

  // 6. Complete Journey ("Arrived Safely")
  const handleCompleteJourney = async () => {
    if (!activeJourney) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/journeys/${activeJourney.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setActiveJourney(null);
        fetchJourneys();
      }
    } catch (err) {
      console.error("Failed to complete journey:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Auto-detect Current GPS for "From"
  const handleUseCurrentGPS = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        setFromLoc(`Current Location (${lat}, ${lon})`);
      },
      () => {
        alert("Unable to retrieve location. Please check location permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Format Helper: Seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const modeIcon: Record<string, string> = {
    CAB: "🚕",
    BUS: "🚌",
    METRO: "🚆",
    WALKING: "🚶",
    CAR: "🚗",
  };

  const modeName: Record<string, string> = {
    CAB: "Cab / Uber",
    BUS: "Bus",
    METRO: "Metro",
    WALKING: "Walking",
    CAR: "Personal Car",
  };

  const isOverdue =
    activeJourney &&
    (activeJourney.status === "DELAYED" ||
      elapsedSeconds > activeJourney.expectedDurationMins * 60);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs font-bold text-neutral-500 hover:text-black uppercase tracking-wider"
            >
              ← Alert
            </Link>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-black">
                Safe Journey
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded font-bold text-neutral-700">
                TRIP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/chat"
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
            >
              Chat 💬
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col space-y-6">
        {/* Intro */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
            Safe Journey Monitoring
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Track your trip from start to finish, attach your live Uber/Ola ride link, and notify emergency contacts if travel takes longer than expected.
          </p>
        </div>

        {/* ========================================================= */}
        {/* ACTIVE JOURNEY CARD (IF CURRENTLY ON A TRIP) */}
        {/* ========================================================= */}
        {activeJourney && (
          <section
            aria-label="Active Journey"
            className={`w-full rounded-2xl p-6 border-2 transition-all shadow-md ${
              isOverdue
                ? "bg-red-50 border-red-600 text-black"
                : "bg-[#F6F6F6] border-black text-black"
            }`}
          >
            {/* Status Banner */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-300">
              <div className="flex items-center space-x-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    isOverdue ? "bg-red-600 animate-ping" : "bg-emerald-600 animate-pulse"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {isOverdue ? "⚠️ TRIP OVERDUE / DELAY DETECTED" : "JOURNEY IN PROGRESS"}
                </span>
              </div>
              <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-neutral-300">
                {modeIcon[activeJourney.transportMode]} {modeName[activeJourney.transportMode]}
              </span>
            </div>

            {/* Route & Purpose */}
            <div className="space-y-1 mb-5">
              <div className="flex items-baseline space-x-2">
                <span className="text-xs font-bold text-neutral-500 uppercase">Route:</span>
                <span className="text-lg font-extrabold tracking-tight">
                  {activeJourney.fromLocation} → {activeJourney.toLocation}
                </span>
              </div>
              {activeJourney.purpose && (
                <p className="text-xs text-neutral-600">
                  <span className="font-semibold">Purpose:</span> {activeJourney.purpose}
                </p>
              )}
            </div>

            {/* Live Timers (Elapsed vs Expected) */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-white rounded-xl border border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                  ELAPSED TIME
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-black">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                  EXPECTED DURATION
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-neutral-700">
                  {activeJourney.expectedDurationMins}m
                </span>
              </div>
            </div>

            {/* Overdue Warning Notice */}
            {isOverdue && (
              <div className="mb-5 p-3.5 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 font-semibold leading-relaxed">
                ⚠️ <strong>Travel time crossed expected limit!</strong> Your emergency contacts were notified via Telegram. If safe, please mark yourself arrived or extend your time below.
              </div>
            )}

            {/* ========================================================= */}
            {/* LIVE RIDE URL SECTION (UBER / OLA LINK) */}
            {/* ========================================================= */}
            <div className="mb-5 p-4 bg-white rounded-xl border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black uppercase tracking-wider">
                  Live Ride Tracking Link
                </span>
                {activeJourney.trackingUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewTrackingUrl(activeJourney.trackingUrl || "");
                      setEditingUrl(!editingUrl);
                    }}
                    className="text-xs font-bold text-neutral-600 hover:text-black underline"
                  >
                    {editingUrl ? "Cancel" : "Edit Link"}
                  </button>
                )}
              </div>

              {/* Display or Click to Open Live URL */}
              {activeJourney.trackingUrl && !editingUrl ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <a
                    href={activeJourney.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 px-4 bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-2 hover:bg-neutral-800 transition-colors shadow-xs"
                  >
                    <span>🔗 OPEN LIVE RIDE (UBER / CAB)</span>
                    <span className="text-[10px] opacity-75">↗</span>
                  </a>
                  <span className="text-[11px] text-neutral-500 font-mono truncate px-1 text-center sm:text-left">
                    {activeJourney.trackingUrl}
                  </span>
                </div>
              ) : (
                /* Add or Edit Live URL */
                <form onSubmit={handleUpdateTrackingUrl} className="space-y-2 pt-1">
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Boarded your cab? Paste your Uber / Ola <strong>"Share Ride Status"</strong> URL so contacts can view your live vehicle location:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={newTrackingUrl}
                      onChange={(e) => setNewTrackingUrl(e.target.value)}
                      placeholder="https://trip.uber.com/..."
                      className="flex-1 h-11 px-3 bg-[#F6F6F6] border border-neutral-300 rounded-lg text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                      required
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
                    >
                      {activeJourney.trackingUrl ? "Update" : "Attach Link"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Action Buttons: Arrived Safely & Extend Time */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleCompleteJourney}
                disabled={isLoading}
                className="flex-1 h-14 bg-black text-white font-bold rounded-xl text-sm sm:text-base hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>✅ ARRIVED SAFELY (END TRIP)</span>
              </button>

              <button
                type="button"
                onClick={() => handleExtend(10)}
                className="h-14 px-5 bg-white border-2 border-black text-black font-bold rounded-xl text-xs sm:text-sm hover:bg-neutral-100 transition-all shrink-0"
                title="Add 10 minutes if stuck in traffic"
              >
                +10 Mins Delay
              </button>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* NEW JOURNEY BUTTON / MODAL */}
        {/* ========================================================= */}
        {!activeJourney && !isCreating && (
          <div className="p-8 bg-[#F6F6F6] border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-2xl shadow-xs">
              🚕
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-black tracking-tight">
                No Journey Currently Active
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                Taking a cab, bus, or walking? Start a monitored trip so trusted contacts can see your ETA and live tracking link.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="h-14 px-8 bg-black text-white font-bold text-sm tracking-tight rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition-all shadow-sm"
            >
              + START NEW JOURNEY
            </button>
          </div>
        )}

        {/* Start Journey Form */}
        {isCreating && (
          <section className="bg-[#F6F6F6] border-2 border-black rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-200">
              <h2 className="text-lg font-extrabold text-black">New Safe Journey</h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs font-bold text-neutral-500 hover:text-black"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleStartJourney} className="space-y-4">
              {/* From Location */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="from-input"
                    className="text-xs font-bold uppercase tracking-wider text-neutral-700"
                  >
                    From (Starting Point)
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    className="text-[11px] font-bold text-neutral-600 hover:text-black underline flex items-center space-x-1"
                  >
                    <span>📍 Auto-fill GPS</span>
                  </button>
                </div>
                <input
                  id="from-input"
                  type="text"
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  placeholder="e.g. Connaught Place, Office, etc."
                  className="w-full h-12 px-3.5 bg-white border border-neutral-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              {/* To Destination */}
              <div>
                <label
                  htmlFor="to-input"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  To (Destination)
                </label>
                <input
                  id="to-input"
                  type="text"
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  placeholder="e.g. Home, Sector 62, Airport"
                  className="w-full h-12 px-3.5 bg-white border border-neutral-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              {/* Why / Purpose */}
              <div>
                <label
                  htmlFor="purpose-input"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  Purpose / Reason (Optional)
                </label>
                <input
                  id="purpose-input"
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Heading home after dinner"
                  className="w-full h-12 px-3.5 bg-white border border-neutral-300 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Mode Selection Tabs */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Mode of Transport
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { key: "CAB", label: "🚕 Cab / Uber" },
                    { key: "BUS", label: "🚌 Bus" },
                    { key: "METRO", label: "🚆 Metro" },
                    { key: "WALKING", label: "🚶 Walking" },
                    { key: "CAR", label: "🚗 Car" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setTransportMode(m.key)}
                      className={`h-11 px-2 rounded-xl text-xs font-bold border transition-all ${
                        transportMode === m.key
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Duration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Expected Duration
                  </span>
                  <span className="text-xs font-bold font-mono text-black">
                    {durationMins} minutes
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMins(mins)}
                      className={`h-10 rounded-xl text-xs font-bold border ${
                        durationMins === mins
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Ride Tracking URL (Optional initially) */}
              <div>
                <label
                  htmlFor="ride-url-input"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
                >
                  Live Ride Link (Uber / Ola Share URL) — Optional
                </label>
                <input
                  id="ride-url-input"
                  type="url"
                  value={rideUrl}
                  onChange={(e) => setRideUrl(e.target.value)}
                  placeholder="https://trip.uber.com/... (can be added later in cab)"
                  className="w-full h-12 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  💡 Tip: You can leave this blank and paste it into the ride card once your cab arrives.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-black text-white font-bold text-sm tracking-tight rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition-all shadow-sm"
                >
                  {isLoading ? "STARTING..." : "START MONITORED JOURNEY 🚀"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================================================= */}
        {/* RECENT JOURNEY HISTORY */}
        {/* ========================================================= */}
        <section aria-labelledby="history-heading" className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h2 id="history-heading" className="text-base font-bold text-black tracking-tight">
              Recent Journey History
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              {history.length} Trips Saved
            </span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">
              No previous journeys recorded.
            </p>
          ) : (
            <div className="space-y-2.5">
              {history.map((j) => (
                <div
                  key={j.id}
                  className="p-4 bg-[#F6F6F6] border border-neutral-200 rounded-xl hover:border-black transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-neutral-200">
                      {modeIcon[j.transportMode]} {modeName[j.transportMode]}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                        j.status === "COMPLETED"
                          ? "bg-black text-white"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {j.status}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-black">
                    {j.fromLocation} → {j.toLocation}
                  </p>

                  <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 font-mono">
                    <span>
                      Total Time:{" "}
                      <strong className="text-black">
                        {j.actualDurationMinutes ? `${j.actualDurationMinutes}m` : "N/A"}
                      </strong>{" "}
                      (Expected: {j.expectedDurationMins}m)
                    </span>
                    <span>{new Date(j.startedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Nav Footer Pills */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href="/gps"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            📍 GPS Share
          </Link>
          <Link
            href="/ring"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            👥 Circle
          </Link>
          <Link
            href="/chk"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            ⏱️ Check-in
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 font-semibold transition"
          >
            💬 Chat
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-4 mt-auto">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-2 sm:space-y-0">
          <span>Safe Journey Personal Safety</span>
          <span className="font-mono">Real-time Telegram Alerts</span>
        </div>
      </footer>
    </div>
  );
}
