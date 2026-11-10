"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import Instructions from "@/components/Instructions";
import AutoAlertScanner from "@/components/AutoAlertScanner";
import StatusCard from "@/components/StatusCard";
import ScreenReaderAnnouncer from "@/components/ScreenReaderAnnouncer";
import { DeliveryStatus, SecurityAlertResponse } from "@/lib/types";
import { sfx } from "@/lib/audio";

interface ChannelDisplayState {
  status: DeliveryStatus;
  recipient?: string;
  details?: string;
  error?: string;
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [alertDispatched, setAlertDispatched] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "Welcome to the Accessible Security Alert System. A 5-second automatic countdown has begun."
  );

  const [alertInitiatedStatus, setAlertInitiatedStatus] = useState<DeliveryStatus>("IDLE");
  const [callState, setCallState] = useState<ChannelDisplayState>({ status: "IDLE" });
  const [emailState, setEmailState] = useState<ChannelDisplayState>({ status: "IDLE" });
  const [telegramState, setTelegramState] = useState<ChannelDisplayState>({ status: "IDLE" });
  const [smsState, setSmsState] = useState<ChannelDisplayState>({ status: "IDLE" });
  const [whatsappState, setWhatsappState] = useState<ChannelDisplayState>({ status: "IDLE" });
  const [activityState, setActivityState] = useState<ChannelDisplayState>({ status: "IDLE" });

  const [lastTriggerTime, setLastTriggerTime] = useState<string | null>(null);

  const executeAlertTrigger = useCallback(async () => {
    setIsLoading(true);
    setAlertDispatched(false);
    const currentTimestamp = new Date().toISOString();
    setLastTriggerTime(new Date().toLocaleTimeString());

    // Update UI states to Pending
    setAlertInitiatedStatus("SENT");
    setCallState({ status: "PENDING" });
    setEmailState({ status: "PENDING" });
    setTelegramState({ status: "PENDING" });
    setSmsState({ status: "PENDING" });
    setWhatsappState({ status: "PENDING" });
    setActivityState({ status: "PENDING" });

    setAnnouncement(
      "Security alert initiated. Dispersing emergency notifications and phone call across channels."
    );

    try {
      const response = await fetch("/api/security-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "auto-scanner-client",
          clientTimestamp: currentTimestamp,
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        const msg = errorData.error || "Rate limit reached. Please wait before re-triggering.";
        setAnnouncement(msg);
        sfx.playFailureBuzz();
        sfx.speak(msg);
        setIsLoading(false);
        return;
      }

      const data: SecurityAlertResponse = await response.json();

      if (response.ok && data.success) {
        setAlertDispatched(true);

        setCallState({
          status: data.channels.call.status,
          recipient: data.channels.call.recipient,
          details: data.channels.call.details,
          error: data.channels.call.error,
        });

        setEmailState({
          status: data.channels.email.status,
          recipient: data.channels.email.recipient,
          details: data.channels.email.details,
          error: data.channels.email.error,
        });

        setTelegramState({
          status: data.channels.telegram.status,
          recipient: data.channels.telegram.recipient,
          details: data.channels.telegram.details,
          error: data.channels.telegram.error,
        });

        setSmsState({
          status: data.channels.sms.status,
          recipient: data.channels.sms.recipient,
          details: data.channels.sms.details,
          error: data.channels.sms.error,
        });

        setWhatsappState({
          status: data.channels.whatsapp.status,
          recipient: data.channels.whatsapp.recipient,
          details: data.channels.whatsapp.details,
          error: data.channels.whatsapp.error,
        });

        setActivityState({
          status: data.activityLogged ? "SENT" : "FAILED",
          details: data.activityLogged
            ? `Audit record saved in Neon DB (ID: ${data.alertId})`
            : "Database record not saved",
        });

        // Trigger Success Sound Effect and Voice Confirmation
        sfx.playSuccessChime();
        sfx.speak(`Alert complete. ${data.summary}`);
        setAnnouncement(`Security Alert processed. ${data.summary}`);
      } else {
        sfx.playFailureBuzz();
        sfx.speak("Alert failed to process on server.");
        setCallState({ status: "FAILED", error: "Server rejection" });
        setEmailState({ status: "FAILED", error: "Server rejection" });
        setTelegramState({ status: "FAILED", error: "Server rejection" });
        setSmsState({ status: "FAILED", error: "Server rejection" });
        setWhatsappState({ status: "FAILED", error: "Server rejection" });
        setActivityState({ status: "FAILED", error: "Failed to log" });
      }
    } catch {
      sfx.playFailureBuzz();
      sfx.speak("Network connection error. Unable to dispatch.");
      setCallState({ status: "FAILED", error: "Network disconnected" });
      setEmailState({ status: "FAILED", error: "Network disconnected" });
      setTelegramState({ status: "FAILED", error: "Network disconnected" });
      setSmsState({ status: "FAILED", error: "Network disconnected" });
      setWhatsappState({ status: "FAILED", error: "Network disconnected" });
      setActivityState({ status: "FAILED", error: "Network disconnected" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Screen Reader Live Region */}
      <ScreenReaderAnnouncer message={announcement} />

      {/* Top Header */}
      <Header />

      {/* Main Container - Mobile First Centered Layout */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col space-y-6">
        {/* Service Heading */}
        <section aria-labelledby="main-heading" className="space-y-1">
          <h1
            id="main-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black"
          >
            Emergency Security Alert
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-snug">
            Automatic countdown initiates emergency alert dispatch across Voice Call, Telegram, Email, and Database audit.
          </p>
        </section>

        {/* Screen Reader Instructions */}
        <Instructions />

        {/* Automatic 5-Second Scanner Component with SFX */}
        <section aria-label="Automated Security Alert Scanner Action" className="pt-2">
          <AutoAlertScanner
            onTrigger={executeAlertTrigger}
            isLoading={isLoading}
            alertDispatched={alertDispatched}
          />
          {lastTriggerTime && (
            <p className="text-xs text-center text-neutral-500 mt-2 font-mono">
              Last alert processed at: {lastTriggerTime}
            </p>
          )}
        </section>

        {/* Status System / Notification Progress */}
        <section aria-labelledby="progress-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h2
              id="progress-heading"
              className="text-base font-bold tracking-tight text-black"
            >
              Delivery & Channel Status
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              {alertInitiatedStatus === "IDLE" ? "STANDBY" : "PROCESSED"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <StatusCard
              channelName="1. Trigger Core"
              provider="Auto-Scanner Engine"
              status={alertInitiatedStatus}
              details={
                alertInitiatedStatus === "SENT"
                  ? "Alert signal fired by 5-second countdown"
                  : "Awaiting countdown completion"
              }
            />

            <StatusCard
              channelName="2. Emergency Voice Call"
              provider="Infobip Voice API"
              status={callState.status}
              recipient={callState.recipient}
              details={callState.details}
              error={callState.error}
            />

            <StatusCard
              channelName="3. Mobile Alarm (Telegram Bot)"
              provider="Telegram Bot API"
              status={telegramState.status}
              recipient={telegramState.recipient}
              details={telegramState.details}
              error={telegramState.error}
            />

            <StatusCard
              channelName="4. Email Notification"
              provider="Resend API"
              status={emailState.status}
              recipient={emailState.recipient}
              details={emailState.details}
              error={emailState.error}
            />

            <StatusCard
              channelName="5. Activity Audit Log"
              provider="Neon PostgreSQL + Prisma"
              status={activityState.status}
              details={activityState.details}
              error={activityState.error}
            />

            <StatusCard
              channelName="6. SMS Notification"
              provider="Twilio Messaging"
              status={smsState.status}
              recipient={smsState.recipient}
              details={smsState.details}
              error={smsState.error}
            />

            <StatusCard
              channelName="7. WhatsApp Notification"
              provider="WhatsApp Cloud API"
              status={whatsappState.status}
              recipient={whatsappState.recipient}
              details={whatsappState.details}
              error={whatsappState.error}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-4 mt-auto">
        <div className="max-w-xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-2 sm:space-y-0">
          <span>Accessible Security Alert System</span>
          <span className="font-mono">Voice Call & Audio SFX Enabled</span>
        </div>
      </footer>
    </div>
  );
}
