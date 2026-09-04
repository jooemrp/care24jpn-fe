import "server-only";

import { cache } from "react";
import { unwrap } from "@/lib/api";
import { getPageBlocksStrict } from "./client";
import { mapSite, type SiteContent } from "./site-map";

/**
 * The blocks -> `SiteContent` mapping itself lives in `./site-map` — a
 * dependency-free module `site.test.ts` can actually import and exercise
 * directly (no `server-only`, no bundler). This file stays the thin
 * server-only wrapper: fetch the page's blocks, hand them to the pure
 * mapping, and let typed CMS failures propagate when Atlas is unreachable or
 * the shape does not match. React's `cache()` dedupes the fetch per request.
 * See `./site-map` for the mapping itself.
 */
export type { SiteContent };

async function fetchSite(): Promise<SiteContent> {
  return mapSite(unwrap(await getPageBlocksStrict("site")));
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getSite()` on the same request triggers at most one fetch. */
export const getSite = cache(fetchSite);
