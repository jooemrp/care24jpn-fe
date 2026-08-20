/**
 * The pure blocks -> raw-legal-fields selection, lifted out of
 * `features/cms/legal.ts#readLegalFields`, following the exact pattern
 * `site-map.ts` established for `site.ts` (see that file's header for the
 * full rationale — the short version: `legal.ts` opens with
 * `import "server-only"`, which is not a real installed package outside
 * Next's own bundler, so nothing that lives in `legal.ts` can be imported by
 * `node --test`).
 *
 * DELIBERATELY DEPENDENCY-FREE OF THE SERVER RUNTIME: no `server-only`, no
 * `./client`, no `react` (in particular no `cache()`), and — unlike
 * `pages-map.ts`/`site-map.ts` — no `@/constants/*` either. This module never
 * needs a fallback VALUE (a missing/empty heading or body means "return
 * null", not "substitute constants text") — only `./fields` and `./types`,
 * both of which stay type-erasable except for `mapBlocksByType`/`pick`
 * themselves. `legal.ts` keeps everything that genuinely needs the server or
 * `constants/legal.ts`: the `getPageBlocks` fetch, the `legalDocs` fallback
 * lookup, and the per-request `cache()` dedupe.
 */

import { mapBlocksByType, pick, type BlockTypeList } from "./fields";
import type { Bilingual, CmsBlock } from "./types";

/** Each `legal-*` page is exactly one `legal-doc` block (see
 * `scripts/atlas/seed-legal.ts#buildLegalDocBlock`) — matched here by
 * content-type slug via `mapBlocksByType`, never by array position (see
 * `fields.ts#mapBlocksByType`'s doc comment for why position is unsafe). */
const LEGAL_TYPES = ["legal-doc"] as const satisfies BlockTypeList;

/** The two localizable fields the `legal-doc` block carries, still in their
 * stored form: `heading` ready to render, `body` as the raw richtext HTML
 * string per locale (NOT yet parsed into `LegalBlock[]`). */
export type RawLegalFields = { heading: Bilingual; body: { ja: string; en: string } };

/**
 * Selects and validates the one `legal-doc` block a `legal-*` page's blocks
 * must contain, and returns `null` — after warning with the caller's own
 * name, so the log still says which entry point gave up — for either of two
 * distinct "use the constants fallback" reasons:
 *
 * - the page's blocks don't contain a `legal-doc` block at all (matched by
 *   content-type SLUG via `mapBlocksByType`, not `blocks[0]` — a legal page
 *   returning its one `legal-doc` block in a different position, or
 *   alongside a block type this reader doesn't expect, used to read
 *   whatever landed at index 0 instead of the actual document);
 * - the block exists but its `heading`/`body` fields are missing, malformed,
 *   or the heading is empty/whitespace-only in either locale. The
 *   empty-heading check mirrors the empty-body check exactly (both would
 *   otherwise render as either an empty `<h1>` or an empty
 *   `Footer.tsx` tokushoho link label) — added deliberately, not an
 *   oversight: a heading present-but-blank used to sail through the
 *   `!heading` check (a `Bilingual` object is truthy even when both its
 *   strings are `""`) exactly like an empty body did before that guard
 *   existed.
 *
 * `caller` and `reportFallback` are threaded through rather than imported
 * (this module may not import `./client`, see the file header) — `legal.ts`
 * passes `client.ts#reportUnexpectedContent` in; tests pass a no-op or a
 * capturing stub, same as `site.test.ts` already does for `mapSite`.
 */
export function selectLegalFields(
  slug: string,
  blocks: CmsBlock[],
  caller: "getLegalDoc" | "getLegalHeading",
  reportFallback: (slug: string, detail: string) => void,
): RawLegalFields | null {
  const groups = mapBlocksByType(slug, blocks, LEGAL_TYPES, reportFallback);
  const block = groups?.["legal-doc"][0];
  if (!block) {
    console.warn(`[cms] ${caller}("${slug}"): no page/block found, using constants fallback`);
    return null;
  }

  // Same guard as every other loader (`fields.ts#pick`) rather than a raw
  // cast: a `heading`/`body` that came back as something other than a
  // `{ ja: string; en: string }` pair used to sail through the cast and only
  // fail later, inside `htmlToBlocks`, or render as "[object Object]".
  const heading = pick(block.data, "heading");
  const body = pick(block.data, "body");
  if (!heading || !body || heading.ja.trim() === "" || heading.en.trim() === "") {
    console.warn(
      `[cms] ${caller}("${slug}"): missing or empty heading/body field, using constants fallback`,
    );
    return null;
  }

  return { heading, body };
}
