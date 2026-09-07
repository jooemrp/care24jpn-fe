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
  const rawOrigin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  let origin = rawOrigin;
  try {
    if (rawOrigin) origin = new URL(rawOrigin).origin;
  } catch {
    // Keep raw; upstream allowlist rejects invalid values.
  }
  const result = await submitContactRequest(raw, { origin });

  return new Response(result.body, {
    status: result.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
