/** Whether a tab is the current one; "/" only matches exactly, others match their sub-routes. */
export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Only same-site relative paths are allowed as a post-login redirect; anything else goes to "/". */
export function safeRedirectPath(from: string): string {
  return from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") ? from : "/";
}
