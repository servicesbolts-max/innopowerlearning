/**
 * A same-origin path to continue to after signing in, or the fallback. Browsers silently drop
 * tabs and newlines from URLs ("/\t/evil.example" becomes "//evil.example"), so control
 * characters, whitespace and backslashes are refused outright, and the result must resolve to
 * the current origin.
 */
export function sanitizeNext(
  raw: string | null | undefined,
  origin: string,
  fallback = "/",
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\u0000-\u001f\u007f\s\\]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
