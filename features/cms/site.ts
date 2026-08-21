import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { FALLBACK, mapSite, type SiteContent } from "./site-map";

/**
 * The blocks -> `SiteContent` mapping itself lives in `./site-map` — a
 * dependency-free module `site.test.ts` can actually import and exercise
 * directly (no `server-only`, no bundler). This file stays the thin
 * server-only wrapper: fetch the page's blocks, hand them to the pure
 * mapping, fall back to `constants/copy.ts` (`site-map.ts#FALLBACK`) when
 * Atlas is unreachable or the shape doesn't match, and dedupe the fetch
 * per-request with React's `cache()`. See `./site-map` for the mapping
 * itself and its full rationale.
 */
export type { SiteContent };

async function fetchSite(): Promise<SiteContent> {
  const blocks = await getPageBlocks("site");
  if (!blocks) return FALLBACK;
  return mapSite(blocks, reportUnexpectedContent) ?? FALLBACK;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getSite()` on the same request triggers at most one fetch. */
export const getSite = cache(fetchSite);
