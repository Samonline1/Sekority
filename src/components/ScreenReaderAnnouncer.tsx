"use client";

interface ScreenReaderAnnouncerProps {
  message: string;
}

export default function ScreenReaderAnnouncer({ message }: ScreenReaderAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      data-testid="sr-announcer"
    >
      {message}
    </div>
  );
}
