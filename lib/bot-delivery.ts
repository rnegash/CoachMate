import "server-only";
import { CONSENT_INVITE, CONSENT_VERSION, OPTED_IN, OPTED_OUT, parseKeyword } from "@/lib/bot-consent";
import { discardDraft, handleCheckin } from "@/lib/bot-matcher";
import { supabaseAdmin } from "@/lib/supabase";

// BotDelivery (CLAUDE.md, BotMatcher/BotDelivery split). Sees the phone
// number and consent state; resolves phone -> player ID and decides
// whether a message may be handled at all. Never matches goals or builds
// check-in replies: that is handleCheckin() in BotMatcher, which gets only
// the player ID and message text.
// Tables used: player_contacts, players (roster status only), whatsapp_consents.

/** Player ID for a phone number, only while the player is on the roster. */
async function playerForPhone(phone: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("player_contacts")
    .select("player_id, players!inner(removed_at)")
    .eq("phone", phone)
    .is("players.removed_at", null)
    .maybeSingle<{ player_id: string }>();
  if (error) throw new Error(error.message);
  return data?.player_id ?? null;
}

type Consent = { opted_in_at: string | null; opted_out_at: string | null };

async function consentFor(playerId: string): Promise<Consent | null> {
  const { data, error } = await supabaseAdmin()
    .from("whatsapp_consents")
    .select("opted_in_at, opted_out_at")
    .eq("player_id", playerId)
    .maybeSingle<Consent>();
  if (error) throw new Error(error.message);
  return data;
}

async function setConsent(playerId: string, values: Record<string, string | null>) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("whatsapp_consents")
    .upsert({ player_id: playerId, ...values, updated_at: now });
  if (error) throw new Error(error.message);
}

/**
 * Reply text for an incoming WhatsApp message, or null for no reply.
 * - Unknown number or player not on the roster: no reply, nothing stored.
 * - STOP: opt out, delete the pending draft now; saved check-ins are
 *   purged 7 days after the first STOP (lib/retention-purge.ts) unless
 *   START comes first. A repeated STOP keeps the original date.
 * - START: opt in with the current consent wording.
 * - Not opted in: the consent text, message not stored.
 * - Opted out: no reply (STOP halts all messages).
 */
export async function handleIncoming(phone: string, body: string): Promise<string | null> {
  const playerId = await playerForPhone(phone);
  if (!playerId) return null;

  const now = new Date().toISOString();
  const keyword = parseKeyword(body);
  if (keyword === "stop") {
    // Only the first STOP sets the date, so repeating STOP can't push the
    // 7-day deletion back. START clears it (lib/retention-purge.ts).
    if (!(await consentFor(playerId))?.opted_out_at) {
      await setConsent(playerId, { opted_out_at: now });
    }
    await discardDraft(playerId);
    return OPTED_OUT;
  }
  if (keyword === "start") {
    await setConsent(playerId, { opted_in_at: now, opted_out_at: null, consent_version: CONSENT_VERSION });
    return OPTED_IN;
  }

  const consent = await consentFor(playerId);
  if (consent?.opted_out_at) return null;
  if (!consent?.opted_in_at) return CONSENT_INVITE;
  return handleCheckin(playerId, body);
}
