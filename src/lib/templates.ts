import { prisma } from "./db";
import { ChannelType } from "./types";

export interface FormattedMessage {
  subject?: string;
  body: string;
}

const DEFAULT_TEMPLATES: Record<ChannelType, FormattedMessage> = {
  EMAIL: {
    subject: "🚨 URGENT: Accessible Security Alert Triggered",
    body: `<h2>EMERGENCY SECURITY ALERT</h2>
<p>An emergency alert was triggered by the user via the Accessible Security System.</p>
<p><strong>Trigger Time:</strong> {{timestamp}}</p>
<p><strong>Source:</strong> Web Accessible Emergency Trigger</p>
<p style="color: #b91c1c; font-weight: bold;">Immediate attention required. Please verify user safety immediately.</p>`,
  },
  SMS: {
    body: "🚨 EMERGENCY ALERT: Security alert triggered at {{timestamp}}. Please check on user immediately.",
  },
  TELEGRAM: {
    body: "🚨 <b>EMERGENCY SECURITY ALERT</b>: Security alert was triggered at {{timestamp}}. Immediate attention required.",
  },
  WHATSAPP: {
    body: "*🚨 EMERGENCY SECURITY ALERT*\n\nA security alert was triggered at *{{timestamp}}*.\n\n*Action Required:* Please verify user safety immediately.",
  },
  CALL: {
    body: "Emergency Security Alert. An urgent security alert was triggered by the user at {{timestamp}}. Immediate attention required. Please verify user safety now.",
  },
};

/**
 * Retrieves the message content for a given channel.
 * Reads from the database (seeded templates) if available,
 * falling back to resilient defaults if the database is offline or unseeded.
 */
export async function getAlertMessage(
  channel: ChannelType,
  timestamp: string
): Promise<FormattedMessage> {
  try {
    const template = await prisma.alertTemplate.findUnique({
      where: { channel },
    });

    if (template && template.isActive && template.body) {
      return {
        subject: template.subject
          ? template.subject.replace("{{timestamp}}", timestamp)
          : undefined,
        body: template.body.replace(/\{\{timestamp\}\}/g, timestamp),
      };
    }
  } catch (error) {
    console.warn(
      `[Template Service] Could not fetch DB template for ${channel}, using safe default fallback:`,
      error instanceof Error ? error.message : error
    );
  }

  // Fallback to built-in emergency template
  const fallback = DEFAULT_TEMPLATES[channel];
  return {
    subject: fallback.subject?.replace("{{timestamp}}", timestamp),
    body: fallback.body.replace(/\{\{timestamp\}\}/g, timestamp),
  };
}
