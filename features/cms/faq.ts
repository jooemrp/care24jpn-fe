import "server-only";

import { cache } from "react";
import { apiFailure, apiSuccess, type ApiResult, unwrap } from "@/lib/api";
import { cmsErrorToApiError } from "./errors";
import { getPageBlocksStrict } from "./client";
import { mapFaq, type FaqContent } from "./faq-map";

async function fetchFaq(): Promise<FaqContent> {
  return mapFaq(unwrap(await getPageBlocksStrict("faq")));
}

/** Deduped per-render FAQ content read for the server route boundary. */
export const getFaqContent = cache(fetchFaq);

/** Strict Server Action projection for client-side FAQ navigation. */
export async function getFaqStrict(): Promise<ApiResult<FaqContent>> {
  try {
    return apiSuccess(await getFaqContent());
  } catch (error) {
    return apiFailure(cmsErrorToApiError(error, "The FAQ content is unavailable."));
  }
}
