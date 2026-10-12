import { describe, expect, it } from "vitest";
import { isValidTwilioSignature, twilioSignature, twimlReply, whatsappSender } from "@/lib/twilio";

describe("twilioSignature", () => {
  // Example from Twilio's webhook security docs.
  const token = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };

  it("matches Twilio's documented example", () => {
    expect(twilioSignature(token, url, params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  });

  it("accepts only the matching signature", () => {
    const sig = twilioSignature(token, url, params);
    expect(isValidTwilioSignature(token, url, params, sig)).toBe(true);
    expect(isValidTwilioSignature(token, url, { ...params, Digits: "9" }, sig)).toBe(false);
    expect(isValidTwilioSignature(token, url, params, null)).toBe(false);
    expect(isValidTwilioSignature("", url, params, sig)).toBe(false);
  });
});

describe("whatsappSender", () => {
  it("extracts an E.164 number from a WhatsApp sender", () => {
    expect(whatsappSender("whatsapp:+4915112345678")).toBe("+4915112345678");
    expect(whatsappSender("+4915112345678")).toBeNull();
    expect(whatsappSender(undefined)).toBeNull();
  });
});

describe("twimlReply", () => {
  it("escapes the body and allows an empty reply", () => {
    expect(twimlReply('a < b & "c"')).toContain("<Message>a &lt; b &amp; &quot;c&quot;</Message>");
    expect(twimlReply(null)).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });
});
