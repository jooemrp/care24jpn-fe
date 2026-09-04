import "server-only";

import { cache } from "react";
import { unwrap } from "@/lib/api";
import { getPageBlocksStrict } from "./client";
import { mapSiteManifest, type SiteManifestContent } from "./site-map";

/**
 * Strict CMS projection for `app/manifest.ts`. This intentionally maps only
 * the `site-brand` fields needed by the manifest instead of loading the full
 * rendered site/footer contract used by the shared shell.
 */
async function fetchSiteManifest(): Promise<SiteManifestContent> {
  return mapSiteManifest(unwrap(await getPageBlocksStrict("site")));
}

export const getManifestContent = cache(fetchSiteManifest);
