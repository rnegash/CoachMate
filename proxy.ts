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
  // Everything except the login page itself and static assets.
  // Note: the Twilio webhook route will need an exemption here later —
  // it authenticates via Twilio signature verification instead.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
