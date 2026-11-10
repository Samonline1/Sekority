"use client";

import { useEffect, useState, useRef } from "react";
import { sfx } from "@/lib/audio";

interface AutoAlertScannerProps {
  onTrigger: () => Promise<void>;
  isLoading: boolean;
  alertDispatched: boolean;
}

export default function AutoAlertScanner({
  onTrigger,
  isLoading,
  alertDispatched,
}: AutoAlertScannerProps) {
  const [countdown, setCountdown] = useState<number>(5);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const hasTriggeredRef = useRef(false);

  // Auto-scan countdown on page load
  useEffect(() => {
    if (isCancelled || alertDispatched || isLoading || hasTriggeredRef.current) return;

    if (countdown === 5) {
      sfx.playTick(600);
      sfx.speak("Security alert triggering in 5 seconds.");
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => {
          const next = prev - 1;
          if (next > 0) {
            sfx.playTick(650 + (5 - next) * 50); // Pitch rises as urgency increases
          }
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      sfx.playAlarmTrigger();
      sfx.speak("Dispatching emergency alert now.");
      onTrigger();
    }
  }, [countdown, isCancelled, alertDispatched, isLoading, onTrigger]);

  const handleCancel = () => {
    setIsCancelled(true);
    sfx.playCancelTone();
    sfx.speak("Security alert cancelled.");
  };

  const handleManualTriggerNow = () => {
    hasTriggeredRef.current = true;
    setCountdown(0);
    sfx.playAlarmTrigger();
    sfx.speak("Dispatching emergency alert now.");
    onTrigger();
  };

  const handleReset = () => {
    hasTriggeredRef.current = false;
    setIsCancelled(false);
    setCountdown(5);
    sfx.playTick(600);
    sfx.speak("Countdown restarted. Triggering in 5 seconds.");
  };

  return (
    <div
      role="region"
      aria-label="Security Alert Automated Scanner"
      className="w-full bg-[#F6F6F6] border-2 border-black rounded-2xl p-6 flex flex-col items-center text-center shadow-md"
    >
      <div className="flex items-center space-x-2 mb-2">
        <span
          className={`h-3 w-3 rounded-full ${
            isLoading
              ? "bg-amber-500 animate-ping"
              : alertDispatched
              ? "bg-black"
              : isCancelled
              ? "bg-neutral-400"
              : "bg-red-600 animate-pulse"
          }`}
        />
        <span className="text-xs uppercase font-mono font-bold tracking-widest text-black">
          {isLoading
            ? "DISPATCH IN PROGRESS"
            : alertDispatched
            ? "ALERT DISPATCHED"
            : isCancelled
            ? "DISARMED / CANCELLED"
            : "AUTOMATIC EMERGENCY COUNTDOWN"}
        </span>
      </div>

      {/* Large Bold Countdown Text */}
      <div className="my-3 flex items-center justify-center">
        {!isCancelled && !alertDispatched && !isLoading && (
          <div
            tabIndex={0}
            role="timer"
            aria-live="assertive"
            aria-label={`Security alert triggers in ${countdown} seconds`}
            className="text-7xl sm:text-8xl font-extrabold text-black tracking-tighter select-none font-mono"
          >
            0{countdown}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center space-y-2 py-4">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-bold text-black uppercase tracking-wider">
              Dispersing Alerts...
            </p>
          </div>
        )}

        {alertDispatched && (
          <div className="py-2">
            <div className="text-4xl sm:text-5xl font-black text-black tracking-tight">
              DISPATCHED
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Multi-channel notifications delivered. Check channel status below.
            </p>
          </div>
        )}

        {isCancelled && !alertDispatched && (
          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-extrabold text-neutral-800 tracking-tight">
              ALERT PAUSED
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Countdown disarmed. No alerts were sent.
            </p>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="w-full mt-4 flex flex-col sm:flex-row gap-3">
        {!alertDispatched && !isLoading && (
          <>
            {!isCancelled ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 h-14 bg-white border-2 border-black text-black font-bold rounded-xl text-sm sm:text-base hover:bg-neutral-100 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
                  aria-label="Cancel automatic security alert"
                >
                  CANCEL ALERT
                </button>
                <button
                  type="button"
                  onClick={handleManualTriggerNow}
                  className="flex-1 h-14 bg-black text-white font-bold rounded-xl text-sm sm:text-base hover:bg-neutral-800 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
                  aria-label="Trigger security alert immediately without waiting"
                >
                  TRIGGER NOW
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="w-full h-14 bg-black text-white font-bold rounded-xl text-sm sm:text-base hover:bg-neutral-800 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
                aria-label="Restart 5-second automatic countdown"
              >
                RESTART 5s COUNTDOWN
              </button>
            )}
          </>
        )}

        {alertDispatched && !isLoading && (
          <button
            type="button"
            onClick={handleReset}
            className="w-full h-14 bg-black text-white font-bold rounded-xl text-sm sm:text-base hover:bg-neutral-800 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
            aria-label="Send another security alert"
          >
            TRIGGER ANOTHER ALERT
          </button>
        )}
      </div>
    </div>
  );
}
