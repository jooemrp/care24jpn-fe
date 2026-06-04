import * as Sentry from "@sentry/nextjs";
import { BACKEND_URL, CMS_API_KEY } from "@/lib/config";
import type { ApiResult, ApiError } from "@/lib/api";

const API_PREFIX = "/api/v1/cms/public";

type BffOptions = {
  feature?: string;
  action?: string;
};

type BackendResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  traceId?: string;
};

async function request<T>(
  path: string,
  lang?: string,
  options: BffOptions = {}
): Promise<ApiResult<T>> {
  const searchParams = lang ? `?lang=${lang}` : "";
  const url = `${BACKEND_URL}${API_PREFIX}${path}${searchParams}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": CMS_API_KEY,
  };

  try {
    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    let responseBody: BackendResponse<T> | null = null;
    try {
      responseBody = await response.json();
    } catch {
      // Response might not be JSON
    }

    if (!response.ok) {
      const error: ApiError = {
        code: responseBody?.code || `HTTP_${response.status}`,
        message: responseBody?.message || response.statusText,
        traceId: responseBody?.traceId,
      };

      Sentry.captureException(new Error(error.message), {
        tags: {
          api_error_code: error.code,
          api_endpoint: path,
          ...(options.feature ? { feature: options.feature } : {}),
          ...(options.action ? { action: options.action } : {}),
        },
        extra: {
          status: response.status,
          url,
          traceId: error.traceId,
        },
      });

      return { success: false, error };
    }

    if (responseBody?.data !== undefined) {
      return { success: true, data: responseBody.data };
    }

    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "Unexpected response format from server",
      },
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        api_error_type: "network",
        api_endpoint: path,
        ...(options.feature ? { feature: options.feature } : {}),
        ...(options.action ? { action: options.action } : {}),
      },
      extra: { url },
    });

    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message:
          error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

export const bff = {
  get: <T>(path: string, lang?: string, options?: BffOptions) =>
    request<T>(path, lang, options),
};
