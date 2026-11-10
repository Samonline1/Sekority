"use client";

import { DeliveryStatus } from "@/lib/types";

interface StatusCardProps {
  channelName: string;
  provider: string;
  status: DeliveryStatus;
  details?: string;
  recipient?: string;
  error?: string;
}

export default function StatusCard({
  channelName,
  provider,
  status,
  details,
  recipient,
  error,
}: StatusCardProps) {
  const getBadge = () => {
    switch (status) {
      case "SENT":
        return (
          <span className="px-2.5 py-1 bg-black text-white text-xs font-semibold rounded-md uppercase tracking-wider">
            Sent
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2.5 py-1 bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-md uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 animate-pulse" />
            <span>Sending</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2.5 py-1 border-2 border-red-700 bg-red-50 text-red-900 text-xs font-bold rounded-md uppercase tracking-wider">
            Failed
          </span>
        );
      case "SKIPPED":
        return (
          <span className="px-2.5 py-1 bg-neutral-100 text-neutral-500 text-xs font-medium rounded-md uppercase tracking-wider border border-neutral-200">
            Unconfigured
          </span>
        );
      case "IDLE":
      default:
        return (
          <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-md uppercase tracking-wider border border-neutral-200">
            Standby
          </span>
        );
    }
  };

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${channelName} notification via ${provider}. Status: ${status}`}
      className="p-4 rounded-xl border border-neutral-200 bg-[#F6F6F6] hover:border-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <h3 className="text-sm font-bold text-black tracking-tight">{channelName}</h3>
          <p className="text-xs text-neutral-500">{provider}</p>
        </div>
        <div>{getBadge()}</div>
      </div>

      {recipient && (
        <p className="text-xs text-neutral-600 truncate mt-1">
          <span className="font-medium text-neutral-700">Target:</span> {recipient}
        </p>
      )}

      {details && (
        <p className="text-xs text-neutral-600 mt-0.5">
          {details}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-700 font-medium mt-1 bg-red-50 p-1.5 rounded border border-red-200 break-words">
          Error: {error}
        </p>
      )}
    </div>
  );
}
