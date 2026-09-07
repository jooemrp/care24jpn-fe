import type { NextRequest } from "next/server";
import { submitContactRequest } from "@/features/contact/service";

/**
 * Compatibility entry point for existing browser/API clients. The shared
 * server-only contact service owns configuration, size and Zod validation,
 * origin forwarding, timeout, no-store relay, and stable outcome mapping.
 *
 * The marketing site's `connect-src 'self'` CSP (next.config.ts) is what
 * forces submissions through this same-origin proxy rather than calling the
 * Atlas API directly.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headerOrigin = request.headers.get("origin") ?? "";
  const headerReferer = request.headers.get("referer") ?? "";
  const rawOrigin = headerOrigin || headerReferer;
  let origin = rawOrigin;
  try {
    if (rawOrigin) origin = new URL(rawOrigin).origin;
  } catch {
    // Keep raw; upstream allowlist rejects invalid values.
  }

  console.info("[contact] api/contact POST", {
    headerOrigin: headerOrigin || "(empty)",
    headerReferer: headerReferer ? headerReferer.slice(0, 120) : "(empty)",
    normalizedOrigin: origin || "(empty)",
    bodyBytes: raw.length,
  });

  const result = await submitContactRequest(raw, { origin });

  console.info("[contact] api/contact mapped", {
    normalizedOrigin: origin || "(empty)",
    httpStatus: result.status,
    mappedOutcome: result.outcome,
    upstreamBody: result.body.slice(0, 500),
  });

  return new Response(result.body, {
    status: result.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
