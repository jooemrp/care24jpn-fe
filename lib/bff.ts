import "server-only";

import { fetchPublicPage } from "./bff-core";
import type { ApiResult } from "./api";
import type { RawPageResponse } from "@/features/cms/types";

/**
 * Server-only Atlas delivery adapter.
 *
 * Environment access stays in this module so client components and Server
 * Action callers never bundle or receive the delivery key. The core request
 * implementation remains dependency-free and testable in isolation.
 */
export async function getPublicPage(slug: string): Promise<ApiResult<RawPageResponse>> {
  return fetchPublicPage(slug, {
    baseUrl: process.env.ATLAS_BASE_URL,
    apiKey: process.env.ATLAS_API_KEY,
  });
}
