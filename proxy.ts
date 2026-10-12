import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, accessToken } from "@/lib/access-gate";

// Single shared-password gate (Next 16 renamed middleware.ts -> proxy.ts).
export async function proxy(request: NextRequest) {
  const expected = await accessToken();
  const provided = request.cookies.get(ACCESS_COOKIE)?.value;

  // Fails closed: if APP_SHARED_PASSWORD is unset, nobody gets in.
  if (expected && provided === expected) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login page itself, static assets, and two
  // machine-called routes with their own checks: the Twilio webhook
  // (signature verification) and the Vercel cron (CRON_SECRET). Exact
  // paths only, so a new route is gated until it is exempted on purpose.
  matcher: [
    "/((?!login(?:/|$)|api/whatsapp$|api/cron/retention$|_next/static|_next/image|favicon.ico$).*)",
  ],
};
