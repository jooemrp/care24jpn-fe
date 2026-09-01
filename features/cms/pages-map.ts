/**
 * The pure blocks -> content transforms for the "use-case", "service-flow"
 * and "company" pages, lifted out of `features/cms/pages.ts`, following the
 * exact pattern `site-map.ts` established for `site.ts` (see that file's
 * header for the full rationale — the short version: `pages.ts` opens with
 * `import "server-only"`, which is not a real installed package outside
 * Next's own bundler, so nothing that lives in `pages.ts` can be imported by
 * `node --test`).
 *
 * DELIBERATELY DEPENDENCY-FREE OF THE SERVER RUNTIME: no `server-only`, no
 * `./client`, no `react` (in particular no `cache()`), and — since the
 * no-fallback sweep — no `@/constants/*` VALUE imports. This module MAY
 * import `./types` and `./fields`; `pages.ts` is a loader, and loader-layer
 * files are the ones allowed to talk to the CMS. `constants/*.ts` is no
 * longer a data source at render time: the CMS is the single source of
 * truth, and absent/empty fields render as absent/empty.
 *
 * `pages.ts` keeps everything that genuinely needs the server: the
 * `getPageBlocks(<slug>)` fetches, `reportUnexpectedContent`, and the
 * per-request `cache()` dedupe.
 */

import {
  mapBlocksByType,
  pickBi,
  pickImage,
  pickJa,
  pickLines,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";

const EMPTY: Bilingual = { ja: "", en: "" };

// ---------------------------------------------------------------------------
// use-case (page_hero + use_case_item xN)
// ---------------------------------------------------------------------------

/**
 * The CMS-sourced use-case page content, self-contained (no longer derived
 * from `constants/copy.ts#useCase`). Each case carries its own image URL —
 * no more loop-index `/images/use-case-${i + 1}.webp` derivation.
 */
export type UseCaseContent = {
  hero: { heading: Bilingual; body: Bilingual; ctaHref: string };
  cases: {
    slug: string;
    title: Bilingual;
    body: Bilingual;
    detail: Bilingual;
    highlights: Bilingual[];
    imageAlt: Bilingual;
    image: string;
  }[];
};

const USE_CASE_TYPES = ["page-hero", "use-case-item"] as const satisfies BlockTypeList;

export function mapUseCase(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): UseCaseContent | null {
  const groups = mapBlocksByType("use-case", blocks, USE_CASE_TYPES, reportFallback);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const itemBlocks = groups["use-case-item"];

  const hero: UseCaseContent["hero"] = {
    heading: pickBi(heroBlock.data, "heading"),
    body: pickBi(heroBlock.data, "body"),
    ctaHref: pickJa(heroBlock.data, "cta_href"),
  };

  const cases: UseCaseContent["cases"] = itemBlocks.map((block, i) => ({
    slug: pickJa(block.data, "slug"),
    title: pickBi(block.data, "title"),
    body: pickBi(block.data, "body"),
    detail: pickBi(block.data, "detail"),
    highlights: pickLines(block.data, "highlights"),
    imageAlt: pickBi(block.data, "image_alt"),
    image: pickImage(block.data, "image", `use-case/item[${i}]`),
  }));

  return { hero, cases };
}

// ---------------------------------------------------------------------------
// service-flow (page_hero + service_flow_step xN)
// ---------------------------------------------------------------------------

/** CMS-sourced service-flow page content — shape matches the old
 * `typeof constants/copy.ts#serviceFlow`. */
export type ServiceFlowContent = {
  hero: { heading: Bilingual; body: Bilingual; ctaHref: string };
  steps: { title: Bilingual; body: Bilingual; number: string }[];
};

const SERVICE_FLOW_TYPES = ["page-hero", "service-flow-step"] as const satisfies BlockTypeList;

export function mapServiceFlow(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): ServiceFlowContent | null {
  const groups = mapBlocksByType("service-flow", blocks, SERVICE_FLOW_TYPES, reportFallback);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const stepBlocks = groups["service-flow-step"];

  const hero: ServiceFlowContent["hero"] = {
    heading: pickBi(heroBlock.data, "heading"),
    body: pickBi(heroBlock.data, "body"),
    ctaHref: pickJa(heroBlock.data, "cta_href"),
  };

  // The step's displayed NUMBER is read from the block's own `number` field —
  // NEVER from `i`, the block's position in `stepBlocks` (which
  // `mapBlocksByType` already sorted by `position`, not by the number an
  // editor typed into the step). No index-based fallback exists anymore.
  const steps: ServiceFlowContent["steps"] = stepBlocks.map((block) => ({
    title: pickBi(block.data, "title"),
    body: pickBi(block.data, "body"),
    number: pickJa(block.data, "number"),
  }));

  return { hero, steps };
}

// ---------------------------------------------------------------------------
// company (page_hero + company_row xN)
// ---------------------------------------------------------------------------

/** The company page's `page-hero` block carries only `heading` — the seed
 * writes no `body` for it. A block is matched by its type slug, and
 * `pickBi` already covers an absent field per call site. */
const COMPANY_TYPES = ["page-hero", "company-row"] as const satisfies BlockTypeList;

/** CMS-sourced company page content — shape matches the old
 * `typeof constants/copy.ts#company`. */
export type CompanyContent = {
  heading: Bilingual;
  rows: { key: string; label: Bilingual; value: Bilingual }[];
};

export function mapCompany(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): CompanyContent | null {
  const groups = mapBlocksByType("company", blocks, COMPANY_TYPES, reportFallback);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const rowBlocks = groups["company-row"];

  const heading = pickBi(heroBlock.data, "heading");

  // `row_key` is `pickJa`, not `pickBi`: non-localizable in
  // `scripts/atlas/schema.ts`, because it is an identifier, not copy. There
  // is no index-based fallback anymore: a row whose own key/label/value came
  // back empty renders empty, and `organization.ts#findRow` falls back to
  // label-matching only as a pure parse step (identifier matching), never to
  // a constants VALUE.
  const rows: CompanyContent["rows"] = rowBlocks.map((block) => ({
    key: pickJa(block.data, "row_key"),
    label: pickBi(block.data, "label"),
    value: pickBi(block.data, "value"),
  }));

  return { heading, rows };
}