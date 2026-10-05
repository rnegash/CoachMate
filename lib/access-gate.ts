// Shared-password gate helpers. Used by proxy.ts and the /login action.
// Not an account/session system — see CLAUDE.md "Current Scope Boundaries".

export const ACCESS_COOKIE = "coachmate_access";

// The cookie stores a SHA-256 hash of APP_SHARED_PASSWORD, never the
// password itself. Changing the env var invalidates all existing cookies.
export async function accessToken(): Promise<string | null> {
  const password = process.env.APP_SHARED_PASSWORD;
  if (!password) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`coachmate:${password}`),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
