"use server";

import type { ApiResult } from "@/lib/api";
import { getHomeStrict } from "@/features/cms/home";
import type { HomeContent } from "./types";

/**
 * Strict Server Action for the complete home page payload. The page is one
 * Atlas document, so this action intentionally does not expose section-level
 * fetches that could render mixed CMS snapshots.
 */
export async function getHome(): Promise<ApiResult<HomeContent>> {
  return getHomeStrict();
}
