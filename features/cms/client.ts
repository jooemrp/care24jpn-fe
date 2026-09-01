import "server-only";

import { createClient, type AtlasClient } from "@latellu/atlas-sdk";
import { cache } from "react";
import { shapePageBlocks, shapePageMeta } from "./merge";
import type { CmsBlock, PageMeta, RawPageResponse } from "./types";

/**
 * Every render hits this, so a hang here is a hang for every visitor —
 * unlike `scripts/atlas/lib.ts`'s 15s + retry budget (a human re-runs a
 * manual script), there is no human watching an SSR request.
 *
 * Correction after verifying against the installed SDK (`@latellu/atlas-sdk`
 * 0.3.0, `dist/index.js`): `raw.get` already passes its own
 * `AbortSignal.timeout(DEFAULT_TIMEOUT_MS)` (10s) into `fetchImpl`'s `init`,
 * and `noStoreFetch` already forwarded `init` unchanged — so a dropped-packet
 * hang was already bounded at ~10s, not undici's ~300s idle-socket default;
 * an earlier draft of this comment overstated that as "the site is
 * effectively down". Real prior exposure: every visitor could still wait up
 * to 10s per Atlas call before falling back — not a 300s hang, but longer
 * than we want for an SSR response, and the SDK default isn't ours to tune
 * confidently for the future (a version bump could change or drop it). This
 * file now sets its own, shorter, explicit bound instead of relying on the
 * SDK's.
 *
 * 8s is the deadline. Reasoning, grounded in measured numbers rather than a
 * round guess:
 * - Measured Atlas latency in normal operation (concurrent requests, stable
 *   network) is ~240ms end to end. 8s is roughly 33x that — nowhere close on
 *   a healthy connection, so this never trims a legitimately-slow-but-alive
 *   response into a false fallback.
 * - It exists to absorb a brief network blip (a dropped packet, a momentary
 *   stall) without the visitor silently getting `constants/*.ts` for no
 *   visible reason — the failure mode is transient degradation, not a
 *   permanently slow backend, so the bound only needs to outlast a hiccup,
 *   not accommodate a slow steady state.
 * - It still undercuts the Atlas SDK's own internal default
 *   (`DEFAULT_TIMEOUT_MS` = 10s in `@latellu/atlas-sdk`'s `raw.get`, also
 *   applied via `signal`) so OUR bound is still the one that fires first,
 *   and a visitor is never left waiting out the SDK's longer default.
 * - It's still bounded, not "a few seconds" turned into "however long Atlas
 *   feels like": a visitor who hits a genuinely dead Atlas still gets the
 *   (fallback) page in single-digit seconds, not the ~300s an unbounded
 *   dropped-packet hang could otherwise ride out to.
 */
const NO_STORE_FETCH_TIMEOUT_MS = 8_000;

/**
 * Delivery client. `cache: "no-store"` on purpose — this is NOT SSG. Content
 * editors publish through the Atlas dashboard and expect the site to reflect
 * it without a rebuild/redeploy. ISR (`revalidate: N`) was considered and
 * rejected: it would still serve a stale page for up to N seconds after a
 * publish, and Atlas has no publish webhook wired up here to drive
 * on-demand revalidation instead — `no-store` is the only policy that
 * guarantees "reflects the CMS immediately" with the infrastructure this
 * project actually has.
 *
 * Also attaches the timeout above. The SDK's `raw.get` already passes its own
 * `AbortSignal.timeout(...)` in via `init.signal` (see NO_STORE_FETCH_TIMEOUT_MS
 * doc) — `AbortSignal.any` combines that with ours so whichever fires first
 * wins, instead of one silently overwriting the other.
 */
const noStoreFetch: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(NO_STORE_FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, cache: "no-store", signal });
};

/**
 * Lazily builds (and memoizes) the delivery client — including the "we
 * couldn't build one" outcome — instead of calling `createClient` at module
 * import time.
 *
 * `createClient` throws SYNCHRONOUSLY (`AtlasError`, or `ManagementConfigError`
 * for management-style config issues) when `url`/`apiKey` is missing or
 * invalid. A top-level `createClient(...)` call means that throw happens
 * during module evaluation, before any try/catch in `fetchPageBlocks` can see
 * it — so a missing/blank env var used to crash `next build` outright instead
 * of falling back to `constants/*.ts`. Building the client on first use, inside
 * a try/catch, keeps that failure inside the same "return null, let the
 * loader fall back" contract as a network failure.
 *
 * `undefined` = not attempted yet, `null` = attempted and unavailable
 * (missing config or `createClient` threw). Either way we only attempt once
 * per process so a persistently missing config doesn't retry every request.
 */
let atlasClient: AtlasClient<Record<string, unknown>> | null | undefined;

function getAtlasClient(): AtlasClient<Record<string, unknown>> | null {
  if (atlasClient !== undefined) return atlasClient;

  const url = process.env.ATLAS_BASE_URL ?? "";
  const apiKey = process.env.ATLAS_API_KEY ?? "";

  if (!url || !apiKey) {
    const missing = [!url && "ATLAS_BASE_URL", !apiKey && "ATLAS_API_KEY"]
      .filter(Boolean)
      .join(", ");
    console.warn(
      `[cms:fallback:failure] Atlas not configured (missing ${missing}) — pages will be unavailable (no fallback content).`,
    );
    atlasClient = null;
    return atlasClient;
  }

  try {
    atlasClient = createClient({ url, apiKey, fetchImpl: noStoreFetch });
  } catch (error) {
    // `createClient` throws synchronously (AtlasError / ManagementConfigError)
    // on invalid config — treat exactly like "missing" above.
    console.warn(
      "[cms:fallback:failure] Atlas client failed to initialize — pages will be unavailable (no fallback content).",
      error,
    );
    atlasClient = null;
  }

  return atlasClient;
}

/**
 * Fetches the raw `GET /pages/<slug>` body ONCE, shared by both
 * `getPageBlocks` and `getPageMeta` below. Returns `null` on ANY failure
 * (network error, non-2xx, malformed page, page not found) — never throws.
 * Callers treat `null` as "this page's data is unavailable": the route
 * renders an error / 404 rather than substituting constants fallback
 * content — there is no fallback layer anymore.
 */
async function fetchRawPage(slug: string): Promise<RawPageResponse | null> {
  const atlas = getAtlasClient();
  if (!atlas) return null;

  try {
    const { data: page } = await atlas.raw.get<RawPageResponse>(`/pages/${slug}`);
    return page;
  } catch (error) {
    // Atlas down / key misconfigured / timed out (see NO_STORE_FETCH_TIMEOUT_MS)
    // / page not yet created — never throw out of a loader; callers surface
    // the unavailability. Tagged "failure" (not "unexpected-content" — see
    // reportUnexpectedContent below) because the fetch itself didn't succeed.
    console.error(`[cms:fallback:failure] getRawPage("${slug}") failed:`, error);
    return null;
  }
}

/**
 * Deduped per-render: `getPageBlocks` and `getPageMeta` for the same slug in
 * one render share this single cached fetch, so two calls (e.g. a layout
 * reading metadata and a page reading blocks) issue exactly one HTTP
 * request — mirroring the dedupe pattern documented at
 * app/[lang]/layout.tsx:77-99.
 */
const getRawPage = cache(fetchRawPage);

async function fetchPageBlocks(slug: string): Promise<CmsBlock[] | null> {
  // Everything from here on is pure and lives in ./merge so it can be
  // tested without a bundler — see the header comment there.
  return shapePageBlocks(await getRawPage(slug));
}

async function fetchPageMeta(slug: string): Promise<PageMeta | null> {
  return shapePageMeta(await getRawPage(slug));
}

/**
 * Fetches a page's blocks in both locales, merged and ready for a
 * `features/cms/*.ts` loader to shape into its page's constants-compatible
 * type. Returns `null` on ANY failure — see `fetchRawPage` above.
 */
export const getPageBlocks = cache(fetchPageBlocks);

/**
 * Fetches a page's SEO metadata in both locales, merged and ready for
 * `features/seo/pageMetadata.ts` to shape into a route's `Metadata`. Parallel
 * to `getPageBlocks` above, sharing the same underlying fetch via
 * `getRawPage`. A second loader (ST-03) rather than a change to
 * `getPageBlocks`'s return shape: widening that shape to also carry `seo`
 * would have rippled into every caller of `getPageBlocks` even though most
 * of them never touch `seo`. Returns `null` on ANY failure — see
 * `fetchRawPage` above.
 */
export const getPageMeta = cache(fetchPageMeta);

/**
 * One process-lifetime warning per slug — see reportUnexpectedContent below.
 * Deliberately a plain module-level Set (like `atlasClient` above), not
 * per-request: `getPageBlocks` is called on every no-store request, so
 * without this a persistent shape mismatch (e.g. a nav item added in the
 * dashboard) would log identically forever instead of once.
 */
const reportedUnexpectedContentSlugs = new Set<string>();

/**
 * Call this from a `features/cms/*.ts` loader when `getPageBlocks(slug)`
 * returned an array (the fetch SUCCEEDED — this is not the `null`/failure
 * path above) but the loader is discarding it anyway because the content
 * didn't look like what it expected — today that means
 * `fields.ts#mapBlocksByType` found no block at all of a type the page is
 * built from (every loader passes this function in as its `reportFallback`).
 *
 * Tagged `[cms:fallback:unexpected-content]` — deliberately NOT the
 * `[cms:fallback:failure]` tag used above — because nothing failed here:
 * Atlas answered fine, a human just needs to know the page's content was
 * not used and why.
 *
 * `detail` should name the mismatch concretely (expected vs. received) so
 * the log is actionable without attaching a debugger —
 * `mapBlocksByType` passes the missing type slugs, the block count and every
 * type slug the page DID return.
 *
 * Wired into every block-mapping loader via
 * `fields.ts#mapBlocksByType(slug, blocks, types, reportUnexpectedContent)`.
 */
export function reportUnexpectedContent(slug: string, detail: string): void {
  if (reportedUnexpectedContentSlugs.has(slug)) return;
  reportedUnexpectedContentSlugs.add(slug);
  console.warn(
    `[cms:fallback:unexpected-content] getPageBlocks("${slug}") succeeded but its content was not used (${detail}) — the page will render as unavailable (no constants fallback). Atlas is reachable; the response shape didn't match what the loader expected (e.g. a block was added/removed/reordered in the dashboard). This warning only prints once per slug per process.`,
  );
}
