import "server-only";

import { cache } from "react";
import { getPublicPage } from "@/lib/bff";
import { unwrap, type ApiResult } from "@/lib/api";
import { toPageBlocksResult, toPageMetaResult } from "./results";
import type { CmsBlock, PageMeta, RawPageResponse } from "./types";

/**
 * The BFF performs the request-level policy (credentials, timeout, no-store,
 * JSON validation, and normalized errors). This module owns only the parsed
 * CMS shape plus strict result readers.
 */
/** Fetches one raw page once per render for both strict projections. */
async function fetchRawPageResult(slug: string): Promise<ApiResult<RawPageResponse>> {
  return getPublicPage(slug);
}

/** React `cache()` keeps blocks and metadata reads on one HTTP request. */
const getRawPageResult = cache(fetchRawPageResult);

async function fetchPageBlocksResult(slug: string): Promise<ApiResult<CmsBlock[]>> {
  return toPageBlocksResult(await getRawPageResult(slug));
}

async function fetchPageMetaResult(slug: string): Promise<ApiResult<PageMeta>> {
  return toPageMetaResult(await getRawPageResult(slug));
}

/** Strict result paths for Server Actions and TanStack Query. */
export const getPageBlocksResult = cache(fetchPageBlocksResult);
export const getPageMetaResult = cache(fetchPageMetaResult);
export const getPageBlocksStrict = getPageBlocksResult;
export const getPageMetaStrict = getPageMetaResult;

async function fetchPageBlocks(slug: string): Promise<CmsBlock[]> {
  return unwrap(await getPageBlocksResult(slug));
}

async function fetchPageMeta(slug: string): Promise<PageMeta> {
  return unwrap(await getPageMetaResult(slug));
}

/**
 * Strict throwing readers for server-rendered pages and metadata.
 */
export const getPageBlocks = cache(fetchPageBlocks);
export const getPageMeta = cache(fetchPageMeta);
