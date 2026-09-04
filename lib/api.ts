/**
 * Shared, serializable contracts for Server Actions and client queries.
 *
 * Keep this module free of server-only imports and environment access. A
 * Server Action can return these values through the React/Next boundary, and
 * a client hook can safely unwrap them into a normal query error.
 */

export type ApiFieldErrors = Record<string, string[]>;

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  traceId?: string;
  fieldErrors?: ApiFieldErrors;
}

export type ApiResult<T> =
  | {
      success: true;
      data: T;
      traceId?: string;
    }
  | {
      success: false;
      error: ApiError;
    };

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly traceId?: string;
  readonly fieldErrors?: ApiFieldErrors;
  readonly apiError: ApiError;
  readonly error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
    this.status = error.status;
    this.traceId = error.traceId;
    this.fieldErrors = error.fieldErrors;
    this.apiError = error;
    this.error = error;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function apiSuccess<T>(data: T, traceId?: string): ApiResult<T> {
  return traceId ? { success: true, data, traceId } : { success: true, data };
}

export function apiFailure(error: ApiError): ApiResult<never> {
  return { success: false, error };
}

export function unwrap<T>(result: ApiResult<T>): T {
  if (result.success) return result.data;
  throw new ApiRequestError(result.error);
}
