import type { ApiError } from "@/lib/api";

export type CmsContentErrorCode =
  | "CMS_MISSING_REQUIRED_FIELD"
  | "CMS_INVALID_REQUIRED_FIELD"
  | "CMS_MISSING_REQUIRED_BLOCK"
  | "CMS_INVALID_CONTENT";

/**
 * Raised when Atlas answered but the returned content cannot satisfy the
 * contract required by a rendered surface.
 *
 * Keeping the field paths on the error makes the same failure useful to
 * server error boundaries and to client query error states.
 */
export class CmsContentError extends Error {
  readonly code: CmsContentErrorCode;
  readonly fields: string[];
  readonly slug?: string;

  constructor(
    code: CmsContentErrorCode,
    message: string,
    fields: readonly string[] = [],
    slug?: string,
  ) {
    super(message);
    this.name = "CmsContentError";
    this.code = code;
    this.fields = [...fields];
    this.slug = slug;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isCmsContentError(error: unknown): error is CmsContentError {
  return error instanceof CmsContentError;
}

export function cmsErrorToApiError(
  error: unknown,
  fallbackMessage: string,
  traceId?: string,
): ApiError {
  if (isCmsContentError(error)) {
    return {
      code: error.code,
      message: error.message,
      status: 502,
      ...(error.fields.length > 0 ? { fieldErrors: { cms: error.fields } } : {}),
      ...(traceId ? { traceId } : {}),
    };
  }

  return {
    code: "CMS_INVALID_CONTENT",
    message: fallbackMessage,
    status: 502,
    ...(traceId ? { traceId } : {}),
  };
}
