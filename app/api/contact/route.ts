import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { contactPayloadSchema } from "@/features/contact/schema";

/**
 * Route handler that receives the contact form's browser fetch (public site,
 * proxied here because browsers cannot send the API key the backend /public
 * group requires). It appends the Atlas delivery key from a server-side env
 * var — never exposed to the browser — and forwards the JSON to the Atlas
 * public contact endpoint, passing the visitor's Origin through untouched so
 * the backend's origin gate still sees the real site.
 *
 * The marketing site's `connect-src 'self'` CSP (next.config.ts) is what
 * forces submissions through this same-origin proxy rather than calling the
 * Atlas API directly.
 *
 * Shape validation (Zod) runs here so malformed bodies are rejected before
 * relay; security gates (honeypot, timing, rate limiting, origin gate,
 * HTML-escaping, SMTP) remain in the backend contact usecase. No caching and
 * nothing is stored.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const endpoint = process.env.CONTACT_API_URL ?? "";
  const apiKey = process.env.ATLAS_API_KEY ?? "";

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { success: false, message: "Contact service is not configured." },
      { status: 503 },
    );
  }

  // Body already capped at 16 KiB by the backend; keep an early bound here
  // too so an oversized request never even leaves this server.
  const raw = await request.text();
  if (raw.length > 16 * 1024) {
    return NextResponse.json(
      { success: false, message: "Request body too large." },
      { status: 413 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = contactPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(parsed.data),
      // Never cache and never reuse a stale connection across visitors whose
      // Origin gate differs.
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Contact service unavailable, please try again later." },
      { status: 502 },
    );
  }
}
