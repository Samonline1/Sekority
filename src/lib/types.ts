import { z } from "zod";

export type ChannelType = "EMAIL" | "SMS" | "WHATSAPP" | "TELEGRAM" | "CALL";
export type DeliveryStatus = "IDLE" | "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface ChannelResult {
  channel: ChannelType;
  status: "SENT" | "FAILED" | "SKIPPED";
  messageId?: string;
  error?: string;
  recipient?: string;
  details?: string;
}

export interface SecurityAlertRequest {
  source?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  clientTimestamp: string;
}

export const securityAlertSchema = z.object({
  source: z.string().optional().default("web-accessible-trigger"),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.number().optional(),
    })
    .optional(),
  clientTimestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export interface SecurityAlertResponse {
  success: boolean;
  alertId: string;
  triggeredAt: string;
  channels: {
    email: ChannelResult;
    call: ChannelResult;
    telegram: ChannelResult;
    sms: ChannelResult;
    whatsapp: ChannelResult;
  };
  activityLogged: boolean;
  summary: string;
}
