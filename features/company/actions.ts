"use server";

import { apiFailure, apiSuccess, type ApiResult } from "@/lib/api";
import { cmsErrorToApiError } from "@/features/cms/errors";
import { getCompanyContent } from "@/features/cms/pages";
import type { CompanyContent } from "@/features/cms/pages-map";

/** Strict client-query read; CMS failures are not replaced with constants. */
export async function getCompany(): Promise<ApiResult<CompanyContent>> {
  try {
    return apiSuccess(await getCompanyContent());
  } catch (error) {
    return apiFailure(
      cmsErrorToApiError(error, "The company page content is unavailable."),
    );
  }
}
