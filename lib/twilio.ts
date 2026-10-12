// Pure Twilio helpers for BotDelivery: webhook signature check and the
// TwiML reply. No network or DB access.
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio's X-Twilio-Signature: base64 HMAC-SHA1 (auth token as key) of the
 * full webhook URL followed by every POST param, sorted by name, as
 * name + value with no separators.
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!authToken || !signature) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** "whatsapp:+4915112345678" -> "+4915112345678"; null for anything else. */
export function whatsappSender(from: string | undefined): string | null {
  const match = /^whatsapp:(\+[1-9]\d{6,14})$/.exec(from ?? "");
  return match ? match[1] : null;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** TwiML that sends `body` back to the sender, or an empty response for no reply. */
export function twimlReply(body: string | null): string {
  const message = body ? `<Message>${escapeXml(body)}</Message>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${message}</Response>`;
}
