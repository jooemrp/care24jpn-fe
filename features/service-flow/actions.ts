"use server";

import { apiFailure, apiSuccess, type ApiResult } from "@/lib/api";
import { cmsErrorToApiError } from "@/features/cms/errors";
import { getServiceFlowContent } from "@/features/cms/pages";
import type { ServiceFlowContent } from "@/features/cms/pages-map";

/** Strict client-query read; CMS failures are not replaced with constants. */
export async function getServiceFlow(): Promise<ApiResult<ServiceFlowContent>> {
  try {
    return apiSuccess(await getServiceFlowContent());
  } catch (error) {
    return apiFailure(
      cmsErrorToApiError(error, "The service-flow page content is unavailable."),
    );
  }
}
