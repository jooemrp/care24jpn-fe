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
 *
 * On failure the action still returns `success: true` with a structured
 * `data: { status, code, message }` so the form can show why it failed
 * without treating transport errors and domain rejects the same way.
 */
export async function submitContact(payload: ContactPayload): Promise<SubmitContactResult> {
  try {
    const requestHeaders = await headers();
    // Prefer Origin; fall back to Referer. Normalize a full Referer URL to its
    // origin so the backend allowlist compares hostnames correctly.
    const headerOrigin = requestHeaders.get("origin") ?? "";
    const headerReferer = requestHeaders.get("referer") ?? "";
    const rawOrigin = headerOrigin || headerReferer;
    let origin = rawOrigin;
    try {
      if (rawOrigin) origin = new URL(rawOrigin).origin;
    } catch {
      // Keep the raw value; backend originAllowed will reject garbage.
    }
    const formLoadAt = payload.form_load_at;
    const formLoadAgeMs =
      typeof formLoadAt === "number" && Number.isFinite(formLoadAt)
        ? Date.now() - formLoadAt
        : null;

    console.info("[contact] submitContact start", {
      headerOrigin: headerOrigin || "(empty)",
      headerReferer: headerReferer ? headerReferer.slice(0, 120) : "(empty)",
      normalizedOrigin: origin || "(empty)",
      formLoadAt,
      formLoadAgeMs,
    });

    const result = await submitContactPayloadService(payload, { origin });

    console.info("[contact] submitContact mapped", {
      normalizedOrigin: origin || "(empty)",
      formLoadAt,
      formLoadAgeMs,
      httpStatus: result.status,
      mappedOutcome: result.outcome,
      mappedWhy:
        result.outcome.status === "success"
          ? "upstream accepted"
          : `action returns structured failure code=${"code" in result.outcome ? result.outcome.code : "n/a"}`,
      upstreamBody: result.body.slice(0, 500),
    });

    if (result.outcome.status !== "success") {
      console.error("[contact] submitContact outcome", {
        status: result.outcome.status,
        code: "code" in result.outcome ? result.outcome.code : undefined,
        message: "message" in result.outcome ? result.outcome.message : undefined,
        httpStatus: result.status,
        origin: origin || "(empty)",
        formLoadAt,
        formLoadAgeMs,
      });
    }
    return apiSuccess(result.outcome);
  } catch (err) {
    console.error("[contact] submitContact threw", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return apiFailure({
      code: "CONTACT_ACTION_FAILED",
      message: "Contact service unavailable, please try again later.",
      status: 502,
    });
  }
}
