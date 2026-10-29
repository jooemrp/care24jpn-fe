import { ApiRequestError } from "../../lib/api";
import { CmsContentError } from "../cms/errors";

/** Convert a loader failure to renderable diagnostics before Next strips server
 * Error messages in production. No CMS content is replaced with bundled copy. */
export async function readArticleContent<T>(
  path: string,
  read: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; diagnostic: string }> {
  try {
    return { ok: true, data: await read() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fields = error instanceof CmsContentError ? error.fields : [];
    const code = error instanceof CmsContentError || error instanceof ApiRequestError ? error.code : "CMS_INVALID_CONTENT";
    const trace = error instanceof ApiRequestError && error.traceId ? ` trace=${error.traceId}` : "";
    return { ok: false, diagnostic: `[cms-error: ${path}] ${code}: ${message}${fields.length ? ` (${fields.join(", ")})` : ""}${trace}` };
  }
}
