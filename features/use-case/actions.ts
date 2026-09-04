"use server";

import { apiFailure, apiSuccess, type ApiResult } from "@/lib/api";
import { cmsErrorToApiError } from "@/features/cms/errors";
import { getUseCaseContent } from "@/features/cms/pages";
import type { UseCaseContent } from "@/features/cms/pages-map";

/** Strict client-query read; CMS failures are not replaced with constants. */
export async function getUseCase(): Promise<ApiResult<UseCaseContent>> {
  try {
    return apiSuccess(await getUseCaseContent());
  } catch (error) {
    return apiFailure(
      cmsErrorToApiError(error, "The use-case page content is unavailable."),
    );
  }
}
