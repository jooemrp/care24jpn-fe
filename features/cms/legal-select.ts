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
 * `./client`, no `react` (in particular no `cache()`), and no
 * `@/constants/*` either. Missing or empty fields throw typed CMS errors;
 * this module only depends on `./fields` and `./types`. `legal.ts` keeps the
 * server-only fetch and the per-request `cache()` dedupe.
 */

import { mapBlocksByType, requiredBi, type BlockTypeList } from "./fields";
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
 * Selects and strictly validates the one `legal-doc` block a `legal-*` page's
 * blocks must contain. Missing blocks or fields throw `CmsContentError`.
 */
export function selectLegalFields(
  slug: string,
  blocks: CmsBlock[],
  caller: "getLegalDoc" | "getLegalHeading",
): RawLegalFields {
  void caller;
  const [block] = mapBlocksByType(slug, blocks, LEGAL_TYPES)["legal-doc"];
  const heading = requiredBi(block.data, "heading", `${slug}/legal-doc`);
  const body = requiredBi(block.data, "body", `${slug}/legal-doc`);
  return { heading, body: { ja: body.ja, en: body.en } };
}
