import "server-only";

import {
  submitContactPayload as submitContactPayloadCore,
  submitContactRequest as submitContactRequestCore,
  type ContactPayloadValidation,
  type ContactServiceOptions,
  type ContactServiceResult,
} from "./service-core";
import { contactPayloadSchema } from "./schema";

/**
 * Server-only contact service boundary.
 *
 * The CMS BFF is intentionally not used here: CONTACT_API_URL is a separate
 * allowlisted mutation endpoint with different response semantics. Keeping
 * this adapter explicit makes the integration point clear until a shared BFF
 * mutation contract exists.
 */
function validateContactPayload(payload: unknown): ContactPayloadValidation {
  const parsed = contactPayloadSchema.safeParse(payload);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false };
}

function withServerConfig(options: ContactServiceOptions = {}): ContactServiceOptions {
  return {
    ...options,
    endpoint: options.endpoint ?? process.env.CONTACT_API_URL ?? "",
    apiKey: options.apiKey ?? process.env.ATLAS_API_KEY ?? "",
    validatePayload: validateContactPayload,
  };
}

export function submitContactRequest(
  rawBody: string,
  options?: ContactServiceOptions,
): Promise<ContactServiceResult> {
  return submitContactRequestCore(rawBody, withServerConfig(options));
}

export function submitContactPayload(
  payload: unknown,
  options?: ContactServiceOptions,
): Promise<ContactServiceResult> {
  return submitContactPayloadCore(payload, withServerConfig(options));
}

export type { ContactServiceOptions, ContactServiceResult };
