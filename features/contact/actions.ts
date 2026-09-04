"use server";

import { headers } from "next/headers";
import { apiFailure, apiSuccess, type ApiResult } from "@/lib/api";
import {
  submitContactPayload as submitContactPayloadService,
} from "./service";
import type { ContactPayload } from "./schema";
import type { ContactSubmitResult } from "./status-copy";
import { getContactStrict } from "@/features/cms/contact";
import type { ContactContent } from "@/features/cms/contact-map";

export type SubmitContactResult = ApiResult<ContactSubmitResult>;

/** Strict CMS read for client-side contact-page navigation. */
export async function getContact(): Promise<ApiResult<ContactContent>> {
  return getContactStrict();
}

/**
 * Typed Server Action for contact submissions.
 *
 * The service performs the runtime validation because Server Action arguments
 * are still untrusted. The request origin is read from the action request,
 * never accepted as client-provided form data.
 */
export async function submitContact(payload: ContactPayload): Promise<SubmitContactResult> {
  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin") ?? requestHeaders.get("referer") ?? "";
    const result = await submitContactPayloadService(payload, { origin });

    // Transport/config/upstream failures are represented as stable domain
    // outcomes so the form can preserve its localized error/rate-limit copy.
    return apiSuccess(result.outcome);
  } catch {
    return apiFailure({
      code: "CONTACT_ACTION_FAILED",
      message: "Contact service unavailable, please try again later.",
      status: 502,
    });
  }
}
