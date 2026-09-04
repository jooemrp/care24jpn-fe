import { apiFailure, apiSuccess, type ApiResult } from "@/lib/api";
import { shapePageBlocks, shapePageMeta } from "./merge";
import type { CmsBlock, PageMeta, RawPageResponse } from "./types";

const INVALID_PAYLOAD_MESSAGE = "The CMS returned an invalid page payload.";

function failure<T>(result: Extract<ApiResult<T>, { success: false }>): ApiResult<never> {
  return apiFailure(result.error);
}

function invalidPayload(traceId?: string): ApiResult<never> {
  return apiFailure({
    code: "CMS_INVALID_PAYLOAD",
    message: INVALID_PAYLOAD_MESSAGE,
    status: 502,
    ...(traceId ? { traceId } : {}),
  });
}

/**
 * Converts a successful BFF response into the parsed block shape used by the
 * existing CMS mappers. Failures stay failures for query-backed callers.
 */
export function toPageBlocksResult(
  result: ApiResult<RawPageResponse>,
): ApiResult<CmsBlock[]> {
  if (!result.success) return failure(result);

  const blocks = shapePageBlocks(result.data);
  return blocks
    ? apiSuccess(blocks, result.traceId)
    : invalidPayload(result.traceId);
}

export function toPageMetaResult(result: ApiResult<RawPageResponse>): ApiResult<PageMeta> {
  if (!result.success) return failure(result);

  const meta = shapePageMeta(result.data);
  return meta ? apiSuccess(meta, result.traceId) : invalidPayload(result.traceId);
}
