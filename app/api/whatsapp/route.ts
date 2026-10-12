// Twilio WhatsApp webhook (BotDelivery entry point). Exempt from the
// shared-password gate in proxy.ts; every request must carry a valid
// Twilio signature instead.
import { handleIncoming } from "@/lib/bot-delivery";
import { isValidTwilioSignature, twimlReply, whatsappSender } from "@/lib/twilio";

const twiml = (body: string | null, status = 200) =>
  new Response(twimlReply(body), { status, headers: { "Content-Type": "text/xml" } });

export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form) if (typeof value === "string") params[key] = value;

  // Twilio signs the URL configured in its console. Behind Vercel's proxy
  // request.url can differ from it, so the exact URL can be set explicitly.
  const url = process.env.TWILIO_WEBHOOK_URL || request.url;
  const signature = request.headers.get("x-twilio-signature");
  if (!isValidTwilioSignature(process.env.TWILIO_AUTH_TOKEN ?? "", url, params, signature)) {
    return new Response("Forbidden", { status: 403 });
  }

  const phone = whatsappSender(params.From);
  if (!phone) return twiml(null);
  try {
    return twiml(await handleIncoming(phone, params.Body ?? ""));
  } catch (e) {
    // Log only the error type: messages could echo the phone number or text.
    console.error("WhatsApp webhook failed:", e instanceof Error ? e.name : typeof e);
    return twiml(null);
  }
}
