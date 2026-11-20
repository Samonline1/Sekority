import { prisma } from "./db";
import { ChannelType } from "./types";

export interface FormattedMessage {
  subject?: string;
  body: string;
}

export interface LocationCoordinates {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

const DEFAULT_TEMPLATES: Record<ChannelType, FormattedMessage> = {
  EMAIL: {
    subject: "URGENT: Accessible Security Alert Triggered",
    body: `<h2>EMERGENCY SECURITY ALERT</h2>
<p>An emergency alert was triggered by the user via the Accessible Security System.</p>
<p><strong>Trigger Time:</strong> {{timestamp}}</p>
<p><strong>Source:</strong> Web Accessible Emergency Trigger</p>
<p style="color: #b91c1c; font-weight: bold;">Immediate attention required. Please verify user safety immediately.</p>`,
  },
  SMS: {
    body: "EMERGENCY ALERT: Security alert triggered at {{timestamp}}. Immediate attention required. Please check on user immediately.",
  },
  TELEGRAM: {
    body: "<b>EMERGENCY SECURITY ALERT</b>\n\nSecurity alert was triggered at {{timestamp}}.\n\nImmediate attention required. Please check on user immediately.",
  },
  WHATSAPP: {
    body: "*EMERGENCY SECURITY ALERT*\n\nA security alert was triggered at *{{timestamp}}*.\n\n*Action Required:* Please verify user safety immediately.",
  },
  CALL: {
    body: "Emergency Security Alert. An urgent security alert was triggered by the user at {{timestamp}}. Immediate attention required. Please verify user safety now.",
  },
};

/**
 * Retrieves the message content for a given channel.
 * Reads from the database (seeded templates) if available,
 * falling back to resilient defaults if the database is offline or unseeded.
 * Automatically appends clean GPS coordinates & map links if location is supplied.
 */
export async function getAlertMessage(
  channel: ChannelType,
  timestamp: string,
  location?: LocationCoordinates
): Promise<FormattedMessage> {
  let baseSubject: string | undefined;
  let baseBody: string;

  try {
    const template = await prisma.alertTemplate.findUnique({
      where: { channel },
    });

    if (template && template.isActive && template.body) {
      baseSubject = template.subject
        ? template.subject.replace(/🚨/g, "").trim()
        : undefined;
      baseBody = template.body.replace(/🚨/g, "").trim();
    } else {
      const fallback = DEFAULT_TEMPLATES[channel];
      baseSubject = fallback.subject;
      baseBody = fallback.body;
    }
  } catch {
    const fallback = DEFAULT_TEMPLATES[channel];
    baseSubject = fallback.subject;
    baseBody = fallback.body;
  }

  // Replace timestamp placeholders
  let resolvedSubject = baseSubject
    ? baseSubject.replace(/\{\{timestamp\}\}/g, timestamp)
    : undefined;
  let resolvedBody = baseBody.replace(/\{\{timestamp\}\}/g, timestamp);

  // Clean any remaining emojis
  resolvedBody = resolvedBody.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  if (resolvedSubject) {
    resolvedSubject = resolvedSubject.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  }

  // Append location coordinates if present
  if (location && location.latitude != null && location.longitude != null) {
    const lat = location.latitude.toFixed(6);
    const lon = location.longitude.toFixed(6);
    const acc = location.accuracy ? ` (accuracy: ±${Math.round(location.accuracy)}m)` : "";
    const gmapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}`;

    if (channel === "EMAIL") {
      resolvedBody += `
<div style="margin-top: 16px; padding: 12px; background: #f4f4f5; border: 1px solid #d4d4d8; border-radius: 8px; font-family: sans-serif;">
  <p style="margin: 0 0 6px 0; font-weight: bold; color: #18181b;">LOCATION COORDINATES</p>
  <p style="margin: 0 0 6px 0; font-family: monospace; color: #27272a;">${lat}, ${lon}${acc}</p>
  <p style="margin: 0 0 4px 0;"><a href="${gmapsUrl}" style="color: #2563eb; text-decoration: underline;">Open in Google Maps</a></p>
  <p style="margin: 0;"><a href="${osmUrl}" style="color: #2563eb; text-decoration: underline;">Open in OpenStreetMap</a></p>
</div>`;
    } else if (channel === "TELEGRAM") {
      resolvedBody += `\n\n<b>Location Coordinates:</b>\n<code>${lat}, ${lon}</code>${acc}\nGoogle Maps: ${gmapsUrl}\nOpenStreetMap: ${osmUrl}`;
    } else if (channel === "SMS" || channel === "WHATSAPP") {
      resolvedBody += `\nLocation: ${lat}, ${lon}${acc}\nMaps: ${gmapsUrl}`;
    } else if (channel === "CALL") {
      resolvedBody += ` User location is latitude ${lat}, longitude ${lon}.`;
    }
  }

  return {
    subject: resolvedSubject,
    body: resolvedBody,
  };
}
