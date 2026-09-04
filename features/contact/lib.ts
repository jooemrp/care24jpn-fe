/**
 * Client-safe contact presentation helpers.
 *
 * Submission transport lives in `actions.ts` + `hooks.ts`; this module only
 * keeps the payload/status types and localized status-copy lookup available
 * to client components.
 */
import type { Lang } from "@/features/lang/i18n";
import type { ContactPayload } from "./schema";
import {
  statusCopyFor as pureStatusCopyFor,
  type ContactStatusTable,
  type ContactSubmitResult,
} from "./status-copy";

export type { ContactPayload };
export type { ContactStatusTable, ContactSubmitResult };

/**
 * Picks the localized status copy supplied by the CMS-backed caller for the
 * current submission outcome. "idle" maps to null via the caller.
 */
export function statusCopyFor(
  status: ContactSubmitResult | "sending",
  lang: Lang,
  table: ContactStatusTable,
): string {
  return pureStatusCopyFor(status, lang, table);
}