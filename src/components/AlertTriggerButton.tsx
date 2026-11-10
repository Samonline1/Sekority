"use client";

interface AlertTriggerButtonProps {
  onTrigger: () => void;
  isLoading: boolean;
  cooldownSeconds: number;
}

export default function AlertTriggerButton({
  onTrigger,
  isLoading,
  cooldownSeconds,
}: AlertTriggerButtonProps) {
  const isDisabled = isLoading || cooldownSeconds > 0;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onTrigger}
        disabled={isDisabled}
        aria-label={
          isLoading
            ? "Sending security alert, please wait"
            : cooldownSeconds > 0
            ? `Security alert cooldown active, please wait ${cooldownSeconds} seconds`
            : "Trigger Emergency Security Alert"
        }
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={`w-full h-16 sm:h-20 rounded-xl font-bold text-lg sm:text-xl tracking-tight transition-all duration-150 flex items-center justify-center select-none shadow-md
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black focus-visible:ring-offset-2
          ${
            isDisabled
              ? "bg-neutral-300 text-neutral-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-neutral-800 active:scale-[0.99] active:bg-neutral-900 cursor-pointer"
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center space-x-3">
            <span
              className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>DISPATCHING ALERT...</span>
          </span>
        ) : cooldownSeconds > 0 ? (
          <span>WAIT {cooldownSeconds}s (COOLDOWN)</span>
        ) : (
          <span className="flex items-center space-x-2">
            <span>TRIGGER SECURITY ALERT</span>
          </span>
        )}
      </button>
    </div>
  );
}
