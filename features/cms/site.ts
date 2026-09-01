import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { mapSite, type SiteContent } from "./site-map";

/**
 * The blocks -> `SiteContent` mapping itself lives in `./site-map` — a
 * dependency-free module `site.test.ts` can actually import and exercise
 * directly (no `server-only`, no bundler). This file stays the thin
 * server-only wrapper: fetch the page's blocks, hand them to the pure
 * mapping, and dedupe the fetch per-request with React's `cache()`.
 *
 * No fallback layer: when the CMS page is unreachable or its shape doesn't
 * match, `fetchSite` throws — the route surfaces an error/404 instead of
 * serving stale `constants/*.ts` content. See `./site-map` for the mapping
 * itself and its full rationale.
 */
export type { SiteContent };

async function fetchSite(): Promise<SiteContent> {
  const blocks = await getPageBlocks("site");
  if (!blocks) {
    throw new Error(
      '[cms] getSite("site"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the chrome is unavailable.',
    );
  }
  const mapped = mapSite(blocks, reportUnexpectedContent);
  if (!mapped) {
    throw new Error(
      '[cms] getSite("site"): page data did not match the expected block shape — no fallback content exists; the chrome is unavailable.',
    );
  }
  return mapped;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getSite()` on the same request triggers at most one fetch. */
export const getSite = cache(fetchSite);