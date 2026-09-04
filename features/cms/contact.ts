import "server-only";

import { cache } from "react";
import { apiFailure, apiSuccess, type ApiResult, unwrap } from "@/lib/api";
import { cmsErrorToApiError } from "./errors";
import { getPageBlocksStrict } from "./client";
import { mapContact, type ContactContent } from "./contact-map";

async function fetchContact(): Promise<ContactContent> {
  return mapContact(unwrap(await getPageBlocksStrict("contact")));
}

/** Deduped per-render contact content read for the server route boundary. */
export const getContactContent = cache(fetchContact);

/** Strict Server Action projection for client-side contact navigation. */
export async function getContactStrict(): Promise<ApiResult<ContactContent>> {
  try {
    return apiSuccess(await getContactContent());
  } catch (error) {
    return apiFailure(
      cmsErrorToApiError(error, "The contact page content is unavailable."),
    );
  }
}
