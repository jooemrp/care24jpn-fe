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
 * `./client`, no `react` (in particular no `cache()`). This module MAY import
 * `./types`, `./fields` and `@/constants/*` — `pages.ts` is a loader, and
 * loader-layer files are the ones allowed to read `constants/*.ts`
 * (`features/cms/fields.ts`'s header explains why `fields.ts` itself may
 * not). Keep it that way: adding `server-only`/`./client`/`react`'s `cache()`
 * here silently takes `pages-map.test.ts` offline again.
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
import {
  useCase as fallbackUseCase,
  serviceFlow as fallbackServiceFlow,
  company as fallbackCompany,
} from "@/constants/copy";

type UseCase = typeof fallbackUseCase;
type UseCaseItem = UseCase["cases"][number];
type ServiceFlow = typeof fallbackServiceFlow;
type ServiceFlowStep = ServiceFlow["steps"][number];
type Company = typeof fallbackCompany;
type CompanyRow = Company["rows"][number];

// ---------------------------------------------------------------------------
// use-case (page_hero + use_case_item xN)
// ---------------------------------------------------------------------------

const EMPTY: Bilingual = { ja: "", en: "" };

/**
 * `constants/copy.ts` carries no image paths — the case images used to be
 * derived from the LOOP INDEX in JSX (`/images/use-case-${i + 1}.webp`), so a
 * 5th case added in the dashboard rendered a guaranteed 404. The image is now
 * a property of the case itself; the index survives only in the fallback list
 * below, which addresses the four files that ship with the repo.
 */
export type UseCaseContent = Omit<UseCase, "cases"> & {
  cases: (UseCaseItem & { image: string })[];
};

/** Bundled files, in `constants/copy.ts#useCase.cases` order — the safety net
 * for when Atlas is down or answered without expanding a media id into a URL.
 * A case BEYOND this list falls back to `""`, which `use-case/page.tsx`
 * renders as a case with no image rather than as a broken one. */
export const FALLBACK_CASE_IMAGES = [
  "/images/use-case-1.webp",
  "/images/use-case-2.webp",
  "/images/use-case-3.webp",
  "/images/use-case-4.webp",
];

export const FALLBACK_USE_CASE: UseCaseContent = {
  ...fallbackUseCase,
  cases: fallbackUseCase.cases.map((c, i) => ({ ...c, image: FALLBACK_CASE_IMAGES[i] ?? "" })),
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
  const F = fallbackUseCase;

  const hero: UseCase["hero"] = {
    heading: pickBi(heroBlock.data, "heading", F.hero.heading),
    body: pickBi(heroBlock.data, "body", F.hero.body),
    ctaHref: pickJa(heroBlock.data, "cta_href", F.hero.ctaHref),
  };

  // `F.cases[i]` is indexed defensively: a 5th case added in the dashboard now
  // renders instead of reverting the page, and has no constants counterpart.
  const cases: UseCaseContent["cases"] = itemBlocks.map((block, i) => ({
    slug: pickJa(block.data, "slug", F.cases[i]?.slug ?? ""),
    title: pickBi(block.data, "title", F.cases[i]?.title ?? EMPTY),
    body: pickBi(block.data, "body", F.cases[i]?.body ?? EMPTY),
    detail: pickBi(block.data, "detail", F.cases[i]?.detail ?? EMPTY),
    highlights: pickLines(block.data, "highlights", F.cases[i]?.highlights ?? []),
    imageAlt: pickBi(block.data, "image_alt", F.cases[i]?.imageAlt ?? EMPTY),
    image: pickImage(block.data, "image", FALLBACK_CASE_IMAGES[i] ?? "", `use-case/item[${i}]`),
  }));

  return { hero, cases };
}

// ---------------------------------------------------------------------------
// service-flow (page_hero + service_flow_step xN)
// ---------------------------------------------------------------------------

const SERVICE_FLOW_TYPES = ["page-hero", "service-flow-step"] as const satisfies BlockTypeList;

export function mapServiceFlow(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): ServiceFlow | null {
  const groups = mapBlocksByType("service-flow", blocks, SERVICE_FLOW_TYPES, reportFallback);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const stepBlocks = groups["service-flow-step"];
  const F = fallbackServiceFlow;

  const hero: ServiceFlow["hero"] = {
    heading: pickBi(heroBlock.data, "heading", F.hero.heading),
    body: pickBi(heroBlock.data, "body", F.hero.body),
    ctaHref: pickJa(heroBlock.data, "cta_href", F.hero.ctaHref),
  };

  // The step's displayed NUMBER is read from the block's own `number` field —
  // NEVER from `i`, the block's position in `stepBlocks` (which
  // `mapBlocksByType` already sorted by `position`, not by the number an
  // editor typed into the step). Falling back to `String(i + 1)` only
  // happens when the block itself carries no usable `number` at all, and
  // even then it is this BLOCK's own index, not a neighbour's value.
  const steps: ServiceFlowStep[] = stepBlocks.map((block, i) => ({
    title: pickBi(block.data, "title", F.steps[i]?.title ?? EMPTY),
    body: pickBi(block.data, "body", F.steps[i]?.body ?? EMPTY),
    number: pickJa(block.data, "number", F.steps[i]?.number ?? String(i + 1)),
  }));

  return { hero, steps };
}

// ---------------------------------------------------------------------------
// company (page_hero + company_row xN)
// ---------------------------------------------------------------------------

/** The company page's `page-hero` block carries only `heading` — the seed
 * writes no `body` for it (verified against the live workspace). That is no
 * longer something this list has to state: a block is matched by its type
 * slug, not by which fields it happens to carry, and `pickBi` already covers
 * an absent field per call site. */
const COMPANY_TYPES = ["page-hero", "company-row"] as const satisfies BlockTypeList;

export function mapCompany(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): Company | null {
  const groups = mapBlocksByType("company", blocks, COMPANY_TYPES, reportFallback);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const rowBlocks = groups["company-row"];
  const F = fallbackCompany;

  const heading = pickBi(heroBlock.data, "heading", F.heading);

  // Deliberately NOT `F.rows[i]?.label ?? EMPTY` (what this used to read):
  // that made a row's fallback depend on `i` lining up with
  // `fallbackCompany.rows`' own order, so reordering company rows in the
  // dashboard (Atlas reassigns `position`, `mapBlocksByType` sorts by it)
  // could hand a row an UNRELATED neighbour's label/value whenever the
  // row's own field arrived empty — the exact defect class already fixed for
  // `footer-legal-link`'s `use_legal_heading` default in `site-map.ts#mapSite`
  // (see that function's comment on `legalLinks` for the identical
  // reasoning). These rows feed both the /company table AND, through
  // `JsonLd.tsx` -> `buildOrganizationJsonLd` -> `findRow`, the site-wide
  // legalName/address/foundingDate: a row that inherits a neighbour's LABEL
  // can make `findRow("Trade name")` match the wrong row entirely, which is
  // an identity mix-up, not just a stale value — the same distinction
  // `site-map.ts` draws between `nav[i]`'s href/label fallback (safe: fills
  // a gap, never changes which link is which) and `use_legal_heading`'s
  // default (unsafe as an index-based value: changes what KIND of link a row
  // renders as). `EMPTY` is what a row beyond `F.rows`' length already fell
  // back to before this fix; every row now gets that same safe default.
  // `row_key` is `pickJa`, not `pickBi`: non-localizable in
  // `scripts/atlas/schema.ts`, because it is an identifier, not copy. Its
  // fallback is `""` rather than `F.rows[i]?.key` for exactly the reason the
  // comment above gives about index-based fallbacks: guessing a row's
  // IDENTITY from its position is the failure this key exists to prevent, and
  // `organization.ts#findRow` already falls back to label-matching when the
  // key is absent (a workspace seeded before this field existed).
  const rows: CompanyRow[] = rowBlocks.map((block) => ({
    key: pickJa(block.data, "row_key", ""),
    label: pickBi(block.data, "label", EMPTY),
    value: pickBi(block.data, "value", EMPTY),
  }));

  return { heading, rows };
}
