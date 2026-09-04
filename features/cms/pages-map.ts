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
 * `./client`, no `react` (in particular no `cache()`), and no runtime
 * `@/constants/*` imports. The CMS shapes are declared locally so this
 * module can be tested without bundling or an Atlas connection. Keep it that
 * way: adding `server-only`/`./client`/`react`'s `cache()` here silently
 * takes `pages-map.test.ts` offline again.
 *
 * `pages.ts` keeps everything that genuinely needs the server: the strict
 * `getPageBlocksStrict(<slug>)` fetches and the per-request `cache()` dedupe.
 */

import {
  mapBlocksByType,
  requiredBi,
  requiredImageUrl,
  requiredJa,
  requiredUrl,
  optionalLines,
  type BlockTypeList,
} from "./fields";
import type { CmsBlock } from "./types";
import type {
  company as CompanyCopy,
  serviceFlow as ServiceFlowCopy,
  useCase as UseCaseCopy,
} from "@/constants/copy";

type UseCase = typeof UseCaseCopy;
type UseCaseItem = UseCase["cases"][number];
type ServiceFlow = typeof ServiceFlowCopy;
type ServiceFlowStep = ServiceFlow["steps"][number];
type Company = typeof CompanyCopy;
type CompanyRow = Company["rows"][number];

// ---------------------------------------------------------------------------
// use-case (page_hero + use_case_item xN)
// ---------------------------------------------------------------------------

/**
 * The image is a property of each CMS case. It is never inferred from the
 * block position or a bundled file.
 */
export type UseCaseContent = Omit<UseCase, "cases"> & {
  cases: (UseCaseItem & { image: string })[];
};
export type ServiceFlowContent = ServiceFlow;
export type CompanyContent = Company;

const USE_CASE_TYPES = ["page-hero", "use-case-item"] as const satisfies BlockTypeList;

export function mapUseCase(
  blocks: CmsBlock[],
): UseCaseContent {
  const groups = mapBlocksByType("use-case", blocks, USE_CASE_TYPES);

  const [heroBlock] = groups["page-hero"];
  const itemBlocks = groups["use-case-item"];
  const hero: UseCase["hero"] = {
    heading: requiredBi(heroBlock.data, "heading", "use-case/page-hero"),
    body: requiredBi(heroBlock.data, "body", "use-case/page-hero"),
    ctaHref: requiredUrl(heroBlock.data, "cta_href", "use-case/page-hero"),
  };

  const cases: UseCaseContent["cases"] = itemBlocks.map((block, i) => ({
    slug: requiredJa(block.data, "slug", `use-case/use-case-item[${i}]`),
    title: requiredBi(block.data, "title", `use-case/use-case-item[${i}]`),
    body: requiredBi(block.data, "body", `use-case/use-case-item[${i}]`),
    detail: requiredBi(block.data, "detail", `use-case/use-case-item[${i}]`),
    highlights: optionalLines(
      block.data,
      "highlights",
      `use-case/use-case-item[${i}]`,
    ),
    imageAlt: requiredBi(block.data, "image_alt", `use-case/use-case-item[${i}]`),
    image: requiredImageUrl(block.data, "image", `use-case/use-case-item[${i}]`),
  }));

  return { hero, cases };
}

// ---------------------------------------------------------------------------
// service-flow (page_hero + service_flow_step xN)
// ---------------------------------------------------------------------------

const SERVICE_FLOW_TYPES = ["page-hero", "service-flow-step"] as const satisfies BlockTypeList;

export function mapServiceFlow(blocks: CmsBlock[]): ServiceFlow {
  const groups = mapBlocksByType("service-flow", blocks, SERVICE_FLOW_TYPES);

  const [heroBlock] = groups["page-hero"];
  const stepBlocks = groups["service-flow-step"];
  const hero: ServiceFlow["hero"] = {
    heading: requiredBi(heroBlock.data, "heading", "service-flow/page-hero"),
    body: requiredBi(heroBlock.data, "body", "service-flow/page-hero"),
    ctaHref: requiredUrl(heroBlock.data, "cta_href", "service-flow/page-hero"),
  };

  const steps: ServiceFlowStep[] = stepBlocks.map((block, i) => ({
    title: requiredBi(block.data, "title", `service-flow/service-flow-step[${i}]`),
    body: requiredBi(block.data, "body", `service-flow/service-flow-step[${i}]`),
    number: requiredJa(block.data, "number", `service-flow/service-flow-step[${i}]`),
  }));

  return { hero, steps };
}

// ---------------------------------------------------------------------------
// company (page_hero + company_row xN)
// ---------------------------------------------------------------------------

/** The company page's `page-hero` block carries only `heading` — the seed
 * writes no `body` for it (verified against the live workspace). A block is
 * matched by its type slug, not by which fields it happens to carry. */
const COMPANY_TYPES = ["page-hero", "company-row"] as const satisfies BlockTypeList;

export function mapCompany(blocks: CmsBlock[]): Company {
  const groups = mapBlocksByType("company", blocks, COMPANY_TYPES);

  const [heroBlock] = groups["page-hero"];
  const rowBlocks = groups["company-row"];
  const heading = requiredBi(heroBlock.data, "heading", "company/page-hero");

  // Every row carries its own CMS key, label and value. Missing or malformed
  // fields throw instead of borrowing a neighboring row's content.
  const rows: CompanyRow[] = rowBlocks.map((block, i) => ({
    key: requiredJa(block.data, "row_key", `company/company-row[${i}]`),
    label: requiredBi(block.data, "label", `company/company-row[${i}]`),
    value: requiredBi(block.data, "value", `company/company-row[${i}]`),
  }));

  return { heading, rows };
}
