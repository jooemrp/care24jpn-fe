import "server-only";

import { createClient, type AtlasClient } from "@latellu/atlas-sdk";
import { cache } from "react";
import type {
  Bilingual,
  CmsBlock,
  CmsBlockTypeId,
  MergedBlockDataFor,
  ParsedBlockData,
  RawBlockTranslation,
  RawPageResponse,
} from "./types";

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
 * it without a rebuild/redeploy. (See architecture-plan.json#cache_policy for
 * the discarded ISR alternative and why it was rejected for this project.)
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
      `[cms:fallback:failure] Atlas not configured (missing ${missing}) — serving constants/*.ts fallback content for all pages.`,
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
      "[cms:fallback:failure] Atlas client failed to initialize — serving constants/*.ts fallback content for all pages.",
      error,
    );
    atlasClient = null;
  }

  return atlasClient;
}

/**
 * Safely `JSON.parse`s a block/translation `data` string. `raw.get` hands us
 * these as JSON-encoded strings, not objects — the SDK's own locale-merging
 * resources (`pages.get`, `entries().get`) do the same parse internally and
 * default to `{}` on malformed JSON rather than throwing. We mirror that so
 * one corrupt block never takes down a whole page.
 */
function parseData(raw: string | undefined | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Merges one block's base (ja) data with its EN translation, field by field.
 *
 * Contract (client.ts cannot see the workspace schema, so it cannot tell a
 * localizable field from a non-localizable one on its own):
 * - Every STRING field becomes `Bilingual | undefined`. For genuinely
 *   localizable fields (heading, body, label, ...) `en` is the real EN copy.
 *   For non-localizable string fields (href, course_key, icon, tone, slug,
 *   tel, ...) there is only ever one value, so `ja === en` — callers that
 *   know a field is single-language (per architecture-plan.json#block_types)
 *   just read `.ja`.
 * - Every NON-STRING field (number, boolean, null, array, nested object)
 *   passes through unchanged. Atlas never puts non-localizable-by-type
 *   values through translation, and wrapping e.g. `rate_row.customer_price`
 *   in `{ ja, en }` would break `formatYen()`'s `toLocaleString`.
 * - **A field empty in BOTH locales becomes `undefined`, never
 *   `{ ja: "", en: "" }`.** An empty object is truthy — three call sites
 *   (`careCourse.fees[].note`, `rate_row.detail`, `hero.body`) render
 *   conditionally on a field's presence, so a stray empty object silently
 *   changes layout. This is the #1 risk flagged for this migration.
 */
function mergeBlockData(
  baseData: Record<string, unknown>,
  enData: Record<string, unknown>,
): ParsedBlockData {
  const merged: ParsedBlockData = {};

  for (const key of Object.keys(baseData)) {
    const jaRaw = baseData[key];

    if (typeof jaRaw !== "string") {
      // Non-string field: number/boolean/etc. never carry per-locale text.
      merged[key] = jaRaw;
      continue;
    }

    const enRaw = enData[key];
    const ja = jaRaw;
    const en = typeof enRaw === "string" ? enRaw : ja;

    merged[key] = ja === "" && en === "" ? undefined : ({ ja, en } satisfies Bilingual);
  }

  // Fields present only in the EN translation (no base value at all) still
  // need a slot — treat the missing ja side as empty rather than dropping
  // the field, so a translation-only value doesn't silently vanish.
  for (const key of Object.keys(enData)) {
    if (key in baseData) continue;
    const enRaw = enData[key];
    if (typeof enRaw !== "string") continue;
    merged[key] = enRaw === "" ? undefined : ({ ja: "", en: enRaw } satisfies Bilingual);
  }

  return merged;
}

function findEnTranslationData(
  blockId: string,
  translations: RawBlockTranslation[] | undefined,
): Record<string, unknown> {
  const match = translations?.find((t) => t.block_id === blockId && t.locale === "en");
  return parseData(match?.data);
}

/**
 * Fetches a page's blocks in both locales, merged and ready for a
 * `features/cms/*.ts` loader to shape into its page's constants-compatible
 * type. Returns `null` on ANY failure (network error, non-2xx, malformed
 * page, page not found) — never throws — so the caller can fall back to
 * `constants/*.ts` unconditionally.
 */
async function fetchPageBlocks(slug: string): Promise<CmsBlock[] | null> {
  const atlas = getAtlasClient();
  if (!atlas) return null;

  try {
    const { data: page } = await atlas.raw.get<RawPageResponse>(`/pages/${slug}`);
    if (!page || !Array.isArray(page.blocks)) return null;

    const blocks = page.blocks
      .map((block) => {
        const baseData = parseData(block.data);
        const enData = findEnTranslationData(block.id, page.block_translations);
        return {
          id: block.id,
          // Both identifiers are forwarded on purpose. `type` is the
          // hyphenated content-type SLUG ("nav-item") and is what loaders
          // match on; `blockTypeId` is the same type's UUID and is kept
          // because it is the only stable identifier if a slug is ever
          // renamed on the workspace. `?? ""` rather than a throw: a block
          // with no slug simply matches no declared type, so it is ignored
          // (or, if a page's required type is the missing one, the page
          // falls back with a log) instead of taking the whole render down.
          type: block.type ?? "",
          blockTypeId: block.block_type_id,
          parentId: block.parent_id,
          position: block.position,
          data: mergeBlockData(baseData, enData),
        } satisfies CmsBlock;
      })
      .sort((a, b) => a.position - b.position);

    return blocks;
  } catch (error) {
    // Atlas down / key misconfigured / timed out (see NO_STORE_FETCH_TIMEOUT_MS)
    // / page not yet created — never throw out of a loader; callers fall back
    // to constants/*.ts. Tagged "failure" (not "unexpected-content" — see
    // reportUnexpectedContent below) because the fetch itself didn't succeed.
    console.error(`[cms:fallback:failure] getPageBlocks("${slug}") failed, falling back:`, error);
    return null;
  }
}

/**
 * Deduped per-render: several components on the same page can call
 * `getPageBlocks("home")` and only trigger one fetch.
 */
export const getPageBlocks = cache(fetchPageBlocks);

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
 * path above) but the loader is discarding it and falling back to
 * `constants/*.ts` anyway because the content didn't look like what it
 * expected — today that means `fields.ts#mapBlocksByType` found no block at
 * all of a type the page is built from (every loader passes this function in
 * as its `reportFallback`).
 *
 * This is the audit's "silent regression" case: an editor adds one nav
 * item in the dashboard, a loader's exact-count guard stops matching, and
 * the entire page's chrome quietly reverts to `constants/*.ts` with zero
 * signal. Tagged `[cms:fallback:unexpected-content]` — deliberately NOT the
 * `[cms:fallback:failure]` tag used above — because nothing failed here:
 * Atlas answered fine, a human just needs to know their edit didn't take
 * effect and why.
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
    `[cms:fallback:unexpected-content] getPageBlocks("${slug}") succeeded but its content was not used (${detail}) — falling back to constants/*.ts for "${slug}" only. Atlas is reachable; the response shape didn't match what the loader expected (e.g. a block was added/removed/reordered in the dashboard). This warning only prints once per slug per process.`,
  );
}

/**
 * Type-only narrowing helper for a loader that knows which content type a
 * block's `blockTypeId` refers to (per architecture-plan.json#block_types),
 * e.g. `asBlockData<"home-hero">(block.data)`. Purely a compile-time
 * assertion — it does not re-validate anything at runtime, matching how
 * loaders already narrow `ParsedBlockData` themselves; using it just swaps
 * that ad-hoc narrowing for one checked against `atlas.types.ts`, so a
 * renamed/removed field fails `tsc` instead of failing silently. Existing
 * loaders that don't call this are unaffected.
 */
export function asBlockData<K extends CmsBlockTypeId>(
  data: ParsedBlockData,
): MergedBlockDataFor<K> {
  return data as MergedBlockDataFor<K>;
}
