"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, accessToken } from "@/lib/access-gate";

export async function login(_prev: string | null, formData: FormData) {
  const expected = await accessToken();
  if (!expected) return "APP_SHARED_PASSWORD is not configured.";

  if (formData.get("password") !== process.env.APP_SHARED_PASSWORD) {
    return "Falsches Passwort.";
  }

  (await cookies()).set(ACCESS_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Only allow same-site relative redirects.
  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}
