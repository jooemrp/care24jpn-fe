"use server";

import { getFaqStrict } from "@/features/cms/faq";
import type { ApiResult } from "@/lib/api";
import type { FaqContent } from "@/features/cms/faq-map";

/** Strict CMS read for client-side FAQ navigation. */
export async function getFaq(): Promise<ApiResult<FaqContent>> {
  return getFaqStrict();
}
