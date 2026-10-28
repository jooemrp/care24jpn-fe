import "server-only";

import { fetchPublicEntries, fetchPublicPage } from "./bff-core";
import type { ApiResult } from "./api";
import type { RawEntry, RawPageResponse } from "@/features/cms/types";

/**
 * Next.js inlines `process.env.FOO` at build time. Copying `process.env`
 * first keeps Atlas credentials as a runtime lookup so a Vercel function
 * reads the project environment instead of a baked-in empty value.
 */
function atlasDeliveryEnv(): { baseUrl: string | undefined; apiKey: string | undefined } {
  const env = process.env;
  return {
    baseUrl: env.ATLAS_BASE_URL,
    apiKey: env.ATLAS_API_KEY,
  };
}

/**
 * Server-only Atlas delivery adapter.
 *
 * Environment access stays in this module so client components and Server
 * Action callers never bundle or receive the delivery key. The core request
 * implementation remains dependency-free and testable in isolation.
 */
export async function getPublicPage(slug: string): Promise<ApiResult<RawPageResponse>> {
  return fetchPublicPage(slug, atlasDeliveryEnv());
}

/** Published entries of a single content type, with locale resolved by Atlas. */
export async function getPublicEntries(type: string, locale: string): Promise<ApiResult<RawEntry[]>> {
  return fetchPublicEntries(type, locale, atlasDeliveryEnv());
}
