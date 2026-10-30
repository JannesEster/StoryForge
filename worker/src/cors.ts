const PAGES_ORIGIN = "https://jannesester.github.io";

/**
 * Browser calls are limited to the GitHub Pages origin and local dev.
 * Requests with no Origin header (curl, server side tests) are allowed
 * and still pass through rate limiting.
 */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === PAGES_ORIGIN) return true;
  try {
    const url = new URL(origin);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "http:" && local;
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  if (origin && originAllowed(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
