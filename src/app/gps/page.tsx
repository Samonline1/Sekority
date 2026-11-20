"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GPSState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string | null;
}

export default function GPSPage() {
  const [gps, setGps] = useState<GPSState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  const [status, setStatus] = useState<"IDLE" | "LOCATING" | "LOCKED" | "DENIED" | "UNSUPPORTED">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [userNote, setUserNote] = useState("");

  // Manual fallback coordinates
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");

  // Acquire GPS Position
  const fetchLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("UNSUPPORTED");
      setErrorMessage("Browser Geolocation is not supported on this device.");
      return;
    }

    setStatus("LOCATING");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: new Date(pos.timestamp).toLocaleTimeString(),
        });
        setStatus("LOCKED");
      },
      (err) => {
        setStatus("DENIED");
        setErrorMessage(
          err.code === 1
            ? "Location permission was denied. Please allow location access in your browser settings or enter coordinates manually below."
            : err.code === 2
            ? "Position unavailable. Please ensure your device GPS is active."
            : "Location request timed out. Please try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Broadcast Location to Emergency Contacts via Telegram
  const handleBroadcast = async () => {
    const lat = manualMode ? parseFloat(manualLat) : gps.latitude;
    const lon = manualMode ? parseFloat(manualLon) : gps.longitude;

    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      alert("Valid GPS coordinates are required before broadcasting.");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastSuccess(false);

    try {
      const res = await fetch("/api/location/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          accuracy: manualMode ? 50 : gps.accuracy,
          note: userNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastSuccess(true);
        setTimeout(() => setBroadcastSuccess(false), 6000);
      } else {
        alert(data.error || "Failed to broadcast location.");
      }
    } catch {
      alert("Network error while transmitting coordinates.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const currentLat = manualMode ? parseFloat(manualLat) : gps.latitude;
  const currentLon = manualMode ? parseFloat(manualLon) : gps.longitude;

  // OpenStreetMap embed coordinates bounding box
  const delta = 0.005;
  const mapBbox =
    currentLat !== null && currentLon !== null && !isNaN(currentLat) && !isNaN(currentLon)
      ? `${currentLon - delta},${currentLat - delta},${currentLon + delta},${currentLat + delta}`
      : null;

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
                GPS Location
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded font-bold text-neutral-700">
                BROWSER
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/trip"
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
            >
              Trip 🚗
            </Link>
            <Link
              href="/chat"
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
            >
              Chat 💬
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
            Browser GPS & Map
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Native hardware geolocation with zero paid APIs. Preview your live coordinates on OpenStreetMap and broadcast your exact fix to emergency contacts.
          </p>
        </div>

        {/* ========================================================= */}
        {/* GPS TELEMETRY READOUT CARD */}
        {/* ========================================================= */}
        <section className="bg-[#F6F6F6] border-2 border-black rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div className="flex items-center space-x-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  status === "LOCKED"
                    ? "bg-emerald-600 animate-pulse"
                    : status === "LOCATING"
                    ? "bg-amber-500 animate-ping"
                    : "bg-red-600"
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {status === "LOCKED"
                  ? "SATELLITE FIX ACQUIRED"
                  : status === "LOCATING"
                  ? "REQUESTING SATELLITE FIX..."
                  : "GPS UNAVAILABLE"}
              </span>
            </div>

            <button
              type="button"
              onClick={fetchLocation}
              disabled={status === "LOCATING"}
              className="text-xs font-bold px-2.5 py-1 bg-white border border-neutral-300 rounded-md hover:border-black transition-colors"
            >
              {status === "LOCATING" ? "Scanning..." : "↻ Refresh Fix"}
            </button>
          </div>

          {/* Coordinates Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                LATITUDE
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono text-black">
                {gps.latitude !== null ? gps.latitude.toFixed(6) : "—"}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                LONGITUDE
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono text-black">
                {gps.longitude !== null ? gps.longitude.toFixed(6) : "—"}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
                ACCURACY
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono text-black">
                {gps.accuracy !== null ? `±${Math.round(gps.accuracy)}m` : "—"}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* User Note Input */}
          <div>
            <label
              htmlFor="user-note"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
            >
              Optional Emergency Note
            </label>
            <input
              id="user-note"
              type="text"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="e.g. Near main bus stop, wearing blue jacket"
              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Broadcast to Telegram Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={isBroadcasting || (currentLat === null && !manualMode)}
              className={`w-full h-14 rounded-xl font-bold text-sm tracking-tight transition-all flex items-center justify-center space-x-2 shadow-sm ${
                currentLat !== null || manualMode
                  ? "bg-black text-white hover:bg-neutral-800 active:scale-[0.99]"
                  : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <span>{isBroadcasting ? "TRANSMITTING..." : "🚨 BROADCAST GPS TO EMERGENCY CONTACTS"}</span>
            </button>
          </div>

          {broadcastSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl text-center">
              ✅ Coordinates & map links successfully broadcast to your Telegram emergency channel!
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE OPENSTREETMAP PREVIEW */}
        {/* ========================================================= */}
        {currentLat !== null && currentLon !== null && mapBbox && (
          <section className="bg-white border-2 border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                OpenStreetMap Live Map View
              </h2>
              <div className="flex items-center space-x-2">
                <a
                  href={`https://www.google.com/maps?q=${currentLat},${currentLon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-neutral-600 hover:text-black underline"
                >
                  Google Maps ↗
                </a>
                <span className="text-neutral-300">•</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLon}#map=16/${currentLat}/${currentLon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-neutral-600 hover:text-black underline"
                >
                  OpenStreetMap ↗
                </a>
              </div>
            </div>

            <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
              <iframe
                title="OpenStreetMap Live Preview"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&layer=mapnik&marker=${currentLat},${currentLon}`}
              />
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* MANUAL COORDINATE OVERRIDE FALLBACK */}
        {/* ========================================================= */}
        <section className="p-4 bg-[#F6F6F6] border border-neutral-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Manual Coordinates Fallback
            </span>
            <button
              type="button"
              onClick={() => setManualMode(!manualMode)}
              className="text-xs font-bold text-neutral-600 hover:text-black underline"
            >
              {manualMode ? "Disable Manual" : "Enable Manual Entry"}
            </button>
          </div>

          {manualMode && (
            <div className="pt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="28.6139"
                  className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="77.2090"
                  className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-black"
                />
              </div>
            </div>
          )}
        </section>

        {/* Quick Nav Footer Pills */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href="/trip"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            🚗 Safe Trip
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
          <span>Browser GPS & OpenStreetMap</span>
          <span className="font-mono">WGS84 Geolocation Standard</span>
        </div>
      </footer>
    </div>
  );
}
