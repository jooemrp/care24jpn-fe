import { apiFailure, apiSuccess, type ApiFieldErrors, type ApiResult } from "./api";
import type { RawPageResponse } from "../features/cms/types";

export const DEFAULT_BFF_TIMEOUT_MS = 8_000;

export interface BffRequestOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface AtlasEnvelope {
  success?: unknown;
  message?: unknown;
  code?: unknown;
  traceId?: unknown;
  data?: unknown;
  error?: unknown;
  errors?: unknown;
  fieldErrors?: unknown;
  field_errors?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function normalizeFieldErrors(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value)) return undefined;

  const fieldErrors: ApiFieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    if (typeof messages === "string") {
      fieldErrors[field] = [messages];
      continue;
    }
    if (Array.isArray(messages)) {
      const strings = messages.filter((message): message is string => typeof message === "string");
      if (strings.length > 0) fieldErrors[field] = strings;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function traceIdFrom(response: Response, body: AtlasEnvelope | null): string | undefined {
  return (
    asString(body?.traceId) ??
    response.headers.get("x-trace-id") ??
    response.headers.get("x-request-id") ??
    response.headers.get("trace-id") ??
    undefined
  );
}

function errorFromUpstream(response: Response, body: AtlasEnvelope | null) {
  const nestedError = isRecord(body?.error) ? body.error : undefined;
  const source = nestedError ?? body;
  const code = asString(source?.code) ?? `CMS_UPSTREAM_${response.status}`;
  const message =
    asString(source?.message) ??
    `Atlas CMS request failed with status ${response.status}.`;
  const fieldErrors =
    normalizeFieldErrors(source?.fieldErrors) ??
    normalizeFieldErrors(source?.field_errors) ??
    normalizeFieldErrors(source?.errors);

  return {
    code,
    message,
    status: response.status,
    traceId: traceIdFrom(response, body),
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function invalidResponse(message: string, traceId?: string) {
  return apiFailure({
    code: "CMS_INVALID_PAYLOAD",
    message,
    status: 502,
    ...(traceId ? { traceId } : {}),
  });
}

function isRawPageResponse(value: unknown): value is RawPageResponse {
  return isRecord(value) && Array.isArray(value.blocks);
}

function pageUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/v1/public/pages/${encodeURIComponent(slug)}`;
}

/**
 * Calls the one public CMS resource this app needs.
 *
 * This is intentionally a page-specific adapter, not a pass-through proxy:
 * callers cannot provide an arbitrary upstream path or request method.
 */
export async function fetchPublicPage(
  slug: string,
  {
    baseUrl,
    apiKey,
    timeoutMs = DEFAULT_BFF_TIMEOUT_MS,
    fetchImpl = fetch,
  }: BffRequestOptions,
): Promise<ApiResult<RawPageResponse>> {
  const normalizedBaseUrl = baseUrl?.trim();
  const normalizedApiKey = apiKey?.trim();
  if (!normalizedBaseUrl || !normalizedApiKey) {
    return apiFailure({
      code: "CMS_NOT_CONFIGURED",
      message:
        "The CMS service is not configured. Set ATLAS_BASE_URL and ATLAS_API_KEY.",
      status: 503,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let bodyText: string;
  try {
    response = await fetchImpl(pageUrl(normalizedBaseUrl, slug), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": normalizedApiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    bodyText = await response.text();
  } catch {
    const timedOut = controller.signal.aborted;
    if (timedOut) {
      return apiFailure({
        code: "CMS_TIMEOUT",
        message: "The CMS request timed out.",
        status: 504,
      });
    }
    return apiFailure({
      code: "CMS_NETWORK_ERROR",
      message: "The CMS service could not be reached.",
      status: 502,
    });
  } finally {
    clearTimeout(timeout);
  }

  let body: AtlasEnvelope | null;
  try {
    const parsed: unknown = JSON.parse(bodyText);
    body = isRecord(parsed) ? parsed : null;
  } catch {
    return apiFailure({
      code: "CMS_INVALID_JSON",
      message: "The CMS returned malformed JSON.",
      status: 502,
      ...(traceIdFrom(response, null) ? { traceId: traceIdFrom(response, null) } : {}),
    });
  }

  if (!response.ok || body?.success !== true) {
    return apiFailure(errorFromUpstream(response, body));
  }

  const traceId = traceIdFrom(response, body);
  if (!isRawPageResponse(body.data)) {
    return invalidResponse(
      "The CMS returned a successful response with an invalid page payload.",
      traceId,
    );
  }

  return apiSuccess(body.data, traceId);
}
